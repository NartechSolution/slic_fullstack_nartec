pipeline {
    agent any

    stages {

        stage('Set Environment Variables') {
            steps {
                script {
                    if (env.BRANCH_NAME == 'dev') {
                        env.ENV_FILE_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\jenkinsEnv\\slic_pos\\dev\\.env"
                        env.TARGET_PROJECT_PATH = "C:\\Users\\Administrator\\Desktop\\JENKINS_PROJECTS\\slic_pos_dev"
                        env.APP_NAME = 'slic_dev_backend'
                        env.BACKEND_PORT = '1100'
                        echo '📁 Environment set for DEV'
                    } else if (env.BRANCH_NAME == 'master') {
                        env.ENV_FILE_PATH = "C:\\ProgramData\\Jenkins\\.jenkins\\jenkinsEnv\\slic_pos\\prod\\.env"
                        env.TARGET_PROJECT_PATH = "C:\\Users\\Administrator\\Desktop\\JENKINS_PROJECTS\\slic_pos_prod"
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
                    bat(script: "pm2 stop ${env.APP_NAME}", returnStatus: true)
                    bat(script: "pm2 delete ${env.APP_NAME}", returnStatus: true)
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }

        stage('💾 Preserve WhatsApp Session') {
            steps {
                script {
                    bat """
                        @echo off
                        if exist "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth" (
                            echo Preserving WhatsApp session...
                            xcopy /E /I /H /Y /Q "${env.TARGET_PROJECT_PATH}\\backend\\.baileys_auth" "%WORKSPACE%\\backend\\.baileys_auth"
                        ) else (
                            echo No WhatsApp session found
                        )
                    """
                }
            }
        }

        stage('📂 Copy to Target Directory (No Delete)') {
            steps {
                script {
                    bat """
                        @echo off
                        if not exist "${env.TARGET_PROJECT_PATH}" mkdir "${env.TARGET_PROJECT_PATH}"
                        
                        echo Copying updated files...
                        xcopy /E /I /H /Y /Q "%WORKSPACE%\\*" "${env.TARGET_PROJECT_PATH}"
                    """
                }
            }
        }

        /* ================= FRONTEND ================= */

        stage('📁 Install Dependencies - Frontend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\frontend") {
                    bat 'npm install --prefer-offline --no-audit --progress=false --legacy-peer-deps'
                }
            }
        }

        stage('⚙️ Build - Frontend') {
            steps {
                dir("${env.TARGET_PROJECT_PATH}\\frontend") {
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
                    bat 'npm install --prefer-offline --no-audit --progress=false'
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

        stage('🗂️ Prisma Generate') {
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
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }

        stage('✅ Verify Deployment') {
            steps {
                bat 'pm2 list'
                bat "pm2 info ${env.APP_NAME}"
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOYMENT SUCCESSFUL – ${env.APP_NAME}"
        }
        failure {
            echo "❌ DEPLOYMENT FAILED"
        }
        always {
            echo "📊 Finished at: ${new Date()}"
        }
    }
}