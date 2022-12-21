@Library("centreon-shared-library") _

pipeline {
  agent any
  stages {
    stage('Source') {
      agent any
      steps {
        echo "Source"
      }
    }
  }
  post {
    always {
      cleanWs()
    }
  }
}
