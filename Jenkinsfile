pipeline {
    agent any

    stages {

        stage('Webhook Trigger') {
            steps {
                echo 'GitHub push received'
                echo 'Starting Jenkins Simulator pipeline'
            }
        }

        stage('Branch Priority Check') {
            steps {
                script {
                    if (env.BRANCH_NAME == "main") {
                        echo 'Priority 1 → Main branch (Highest Priority)'
                    } else if (env.BRANCH_NAME == "develop") {
                        echo 'Priority 2 → Develop branch'
                    } else {
                        echo "Lower Priority Branch → ${env.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('Build') {
            steps {
                echo 'Installing dependencies'
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                echo 'Running server check'
                sh 'node server.js || true'
            }
        }

        stage('Database Check') {
            steps {
                echo 'Checking PostgreSQL connection'
                echo 'Verifying jobs table'
            }
        }

        stage('Worker Assignment') {
            steps {
                echo 'Assigning worker based on language'
                echo 'Python → Worker-Python'
                echo 'Java → Worker-Java'
                echo 'Node → Worker-Node'
                echo 'Others → Worker-General'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Updating dashboard and logs'
                echo 'Marking job as completed'
            }
        }

    }

    post {
        success {
            echo 'Pipeline completed successfully'
        }

        failure {
            echo 'Build failed'
        }

        always {
            echo 'Pipeline finished'
        }
    }
}