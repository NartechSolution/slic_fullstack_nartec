pipeline {
    agent any

    stages {

        stage('Set Environment Variables') {
            steps {
                script {
                    if (env.BRANCH_NAME == 'dev') {
                        env.ENV_FILE_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\jenkinsEnv\\slic_pos\\dev\\.env"
                        env.TARGET_PROJECT_PATH = "C:\\Users\\Administrator\\Desktop\\JENKINS_PROJECTS\\slic_pos_dev"
                        env.WHATSAPP_BACKUP_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\whatsapp_sessions\\slic_pos_dev"
                        env.APP_NAME = 'slic_dev_backend'
                        env.BACKEND_PORT = '1100'
                        echo '📁 Environment set for DEV'
                    } else if (env.BRANCH_NAME == 'master') {
                        env.ENV_FILE_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\jenkinsEnv\\slic_pos\\prod\\.env"
                        env.TARGET_PROJECT_PATH = "C:\\Users\\Administrator\\Desktop\\JENKINS_PROJECTS\\slic_pos_prod"
                        env.WHATSAPP_BACKUP_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\whatsapp_sessions\\slic_pos_prod"
                        env.APP_NAME = 'slic_prod_backend'
                        env.BACKEND_PORT = '1101'
                        echo '📁 Environment set for PROD'
                    } else {
                        error "❌ Unsupported branch: ${env.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('📦 Checkout') {
            steps {
                checkout scmGit(
                    branches: [[name: "*/${env.BRANCH_NAME}"]],
                    extensions: [
                        [$class: 'CleanBeforeCheckout'],
                        [$class: 'CleanCheckout'],
                        [$class: 'PruneStaleBranch']
                    ],
                    userRemoteConfigs: [[
                        credentialsId: 'dev_majid_new_github_credentials',
                        url: 'https://github.com/AbdulMajid1m1/slic_fullstack_nartec.git'
                    ]]
                )
                bat 'git log -1 --oneline'
            }
        }

        stage('🛑 Stop Existing Backend') {
            steps {
                script {
                    echo "🛑 Stopping PM2 process: ${env.APP_NAME}"
                    bat(script: "pm2 stop ${env.APP_NAME}", returnStatus: true)
                    bat(script: "pm2 delete ${env.APP_NAME}", returnStatus: true)
                    
                    // Give PM2 time to fully release file locks
                    echo "⏳ Waiting for PM2 to fully stop and release file locks..."
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }

        stage('💾 Preserve WhatsApp Session') {
            steps {
                script {
                    echo "💾 Preserving WhatsApp session from target to workspace..."
                    bat """
                        @echo off
                        REM Copy .baileys_auth from target to workspace if it exists
                        if exist "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth" (
                            echo Found existing .baileys_auth session, copying to workspace...
                            xcopy /E /I /H /Y /Q "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth" "%WORKSPACE%\\backend\\.baileys_auth"
                            echo ✅ WhatsApp session preserved in workspace
                        ) else (
                            echo ⚠️ No existing .baileys_auth found - will need fresh QR scan after deployment
                        )
                    """
                }
            }
        }

        stage('📂 Copy to Target Directory') {
            steps {
                script {
                    echo "📂 Copying new code to target directory..."
                    bat """
                        @echo off
                        REM Try to delete target directory with retry
                        if exist "${env.TARGET_PROJECT_PATH}" (
                            echo Attempting to delete target directory...
                            rmdir /s /q "${env.TARGET_PROJECT_PATH}" 2>nul
                            
                            REM Wait a bit if deletion failed
                            if exist "${env.TARGET_PROJECT_PATH}" (
                                echo Waiting for file locks to release...
                                timeout /t 3 /nobreak >nul
                                rmdir /s /q "${env.TARGET_PROJECT_PATH}" 2>nul
                            )
                            
                            REM Force delete any remaining files
                            if exist "${env.TARGET_PROJECT_PATH}" (
                                echo Force deleting remaining files...
                                del /f /s /q "${env.TARGET_PROJECT_PATH}\\*.*" 2>nul
                                rmdir /s /q "${env.TARGET_PROJECT_PATH}" 2>nul
                            )
                        )
                        
                        REM Create fresh directory
                        mkdir "${env.TARGET_PROJECT_PATH}"
                        
                        REM Copy workspace to target (includes preserved .baileys_auth)
                        echo Copying files from workspace to target...
                        xcopy /E /I /H /Y "%WORKSPACE%\\*" "${env.TARGET_PROJECT_PATH}"
                        
                        echo ✅ Files copied successfully
                    """
                }
            }
        }



        /* ================= FRONTEND ================= */

        stage('📁 Install Dependencies - Frontend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\frontend") {
                    bat 'if exist node_modules rmdir /s /q node_modules'
                    bat 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('⚙️ Build - Frontend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\frontend") {
                    bat 'if exist dist rmdir /s /q dist'
                    bat 'npm run build'
                }
            }
        }

        stage('📝 Create web.config - Frontend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\frontend\\dist") {
                    writeFile file: 'web.config', text: '''<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>'''
                }
            }
        }

        /* ================= BACKEND ================= */



        stage('📁 Install Dependencies - Backend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\backend") {
                    bat '''
                        if exist node_modules (
                          attrib -r node_modules\\*.* /s
                          rmdir /s /q node_modules
                        )
                        npm install
                    '''
                }
            }
        }

        stage('📋 Setup Environment File - Backend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\backend") {
                    bat """
                        if not exist "${env.ENV_FILE_PATH}" exit /b 1
                        copy "${env.ENV_FILE_PATH}" ".env"
                    """
                }
            }
        }

        stage('📝 Create web.config - Backend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\backend") {
                    writeFile file: 'web.config', text: """<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:${env.BACKEND_PORT}/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>"""
                }
            }
        }

        stage('🗂️ Update Prisma Schema') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\backend") {
                    bat 'npx prisma generate'
                }
            }
        }

        stage('🚀 Start Backend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\backend") {
                    bat "pm2 start app.js --name ${env.APP_NAME}"
                    bat 'pm2 save'
                    
                    // Give backend time to initialize
                    echo "⏳ Waiting for backend to initialize..."
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }

        stage('✅ Verify Deployment') {
            steps {
                bat 'pm2 list'
                bat "pm2 info ${env.APP_NAME}"
                
                script {
                    echo "📱 WhatsApp Session Status:"
                    bat """
                        @echo off
                        if exist "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth" (
                            echo ✅ WhatsApp .baileys_auth directory exists
                        ) else (
                            echo ⚠️ WhatsApp .baileys_auth directory NOT found - will need QR scan
                        )
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOYMENT SUCCESSFUL – ${env.APP_NAME}"
            echo "📱 WhatsApp session preserved (if existed before deployment)"
        }
        failure {
            echo "❌ DEPLOYMENT FAILED – CHECK LOGS"
            script {
                echo "❌ Deployment failed - attempting to restore WhatsApp session..."
                bat(script: """
                    @echo off
                    REM Try to restore .baileys_auth from workspace if it exists
                    if exist "%WORKSPACE%\\backend\\.baileys_auth" (
                        echo Restoring .baileys_auth from workspace...
                        xcopy /E /I /H /Y /Q "%WORKSPACE%\\backend\\.baileys_auth" "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth"
                    )
                """, returnStatus: true)
            }
        }
        always {
            echo "📊 Finished at: ${new Date()}"
        }
    }
}