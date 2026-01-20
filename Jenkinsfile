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

        stage('💾 Backup WhatsApp Session') {
            steps {
                script {
                    echo "💾 Backing up WhatsApp session data..."
                    bat """
                        @echo off
                        REM Create backup directory if it doesn't exist
                        if not exist "${env.WHATSAPP_BACKUP_PATH}" mkdir "${env.WHATSAPP_BACKUP_PATH}"
                        
                        REM Backup .wwebjs_auth if it exists
                        if exist "${env.TARGET_PROJECT_PATH}\\.wwebjs_auth" (
                            echo Backing up .wwebjs_auth...
                            xcopy /E /I /H /Y /Q "${env.TARGET_PROJECT_PATH}\\.wwebjs_auth" "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_auth"
                        ) else (
                            echo No .wwebjs_auth directory found to backup
                        )
                        
                        REM Backup .wwebjs_cache if it exists
                        if exist "${env.TARGET_PROJECT_PATH}\\.wwebjs_cache" (
                            echo Backing up .wwebjs_cache...
                            xcopy /E /I /H /Y /Q "${env.TARGET_PROJECT_PATH}\\.wwebjs_cache" "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_cache"
                        ) else (
                            echo No .wwebjs_cache directory found to backup
                        )
                        
                        echo ✅ WhatsApp session backup completed
                    """
                }
            }
        }

        stage('📂 Copy to Target Directory') {
            steps {
                bat """
                    if exist "${env.TARGET_PROJECT_PATH}" rmdir /s /q "${env.TARGET_PROJECT_PATH}"
                    mkdir "${env.TARGET_PROJECT_PATH}"
                    xcopy /E /I /H /Y "%WORKSPACE%\\*" "${env.TARGET_PROJECT_PATH}"
                """
            }
        }

        stage('🔄 Restore WhatsApp Session') {
            steps {
                script {
                    echo "🔄 Restoring WhatsApp session data..."
                    bat """
                        @echo off
                        REM Restore .wwebjs_auth if backup exists
                        if exist "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_auth" (
                            echo Restoring .wwebjs_auth...
                            xcopy /E /I /H /Y /Q "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_auth" "${env.TARGET_PROJECT_PATH}\\.wwebjs_auth"
                            echo ✅ .wwebjs_auth restored
                        ) else (
                            echo ⚠️ No .wwebjs_auth backup found - will need fresh QR scan
                        )
                        
                        REM Restore .wwebjs_cache if backup exists
                        if exist "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_cache" (
                            echo Restoring .wwebjs_cache...
                            xcopy /E /I /H /Y /Q "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_cache" "${env.TARGET_PROJECT_PATH}\\.wwebjs_cache"
                            echo ✅ .wwebjs_cache restored
                        ) else (
                            echo ⚠️ No .wwebjs_cache backup found
                        )
                        
                        echo ✅ WhatsApp session restoration completed
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

        stage('🛑 Stop Existing Backend') {
            steps {
                script {
                    echo "🛑 Stopping PM2 process: ${env.APP_NAME}"
                    bat(script: "pm2 stop ${env.APP_NAME}", returnStatus: true)
                    bat(script: "pm2 delete ${env.APP_NAME}", returnStatus: true)
                    
                    // Give PM2 a moment to fully stop
                    echo "⏳ Waiting for PM2 to fully stop..."
                    sleep(time: 3, unit: 'SECONDS')
                }
            }
        }

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
                        if exist "${env.TARGET_PROJECT_PATH}\\.wwebjs_auth" (
                            echo ✅ WhatsApp auth directory exists
                        ) else (
                            echo ⚠️ WhatsApp auth directory NOT found - will need QR scan
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
                // On failure, try to restore session anyway
                bat(script: """
                    if exist "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_auth" (
                        xcopy /E /I /H /Y /Q "${env.WHATSAPP_BACKUP_PATH}\\.wwebjs_auth" "${env.TARGET_PROJECT_PATH}\\.wwebjs_auth"
                    )
                """, returnStatus: true)
            }
        }
        always {
            echo "📊 Finished at: ${new Date()}"
        }
    }
}