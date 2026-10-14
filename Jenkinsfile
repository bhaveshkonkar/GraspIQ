
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                bat 'git --version'
                bat 'node --version'
                bat 'npm --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat '''
                    if exist package-lock.json (
                        call npm ci
                    ) else (
                        call npm install
                    )
                '''
            }
        }

        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Test') {
            steps {
                script {
                    int hasTests = bat(
                        returnStatus: true,
                        script: 'node -e "const p=require(\\'./package.json\\'); process.exit(p.scripts && p.scripts.test ? 0 : 1)"'
                    )

                    if (hasTests == 0) {
                        bat 'npm test'
                    } else {
                        echo 'No test script configured. Test stage skipped.'
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'GraspIQ pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the stage logs above.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
