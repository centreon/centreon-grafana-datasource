@Library("centreon-shared-library") _

pipeline {
  agent any
  stages {
    stage('Source code analysis') {
      parallel {
        stage('Sonarqube analysis') {
          agent any
          steps {
            echo "Analyse grafana datasource"
            withSonarQubeEnv('SonarQubeDev') {
              sh 'ci/grafana-datasource-analysis.sh'
            }
          }
        }
      }
    }

    stage('Quality gate') {
      // sonarQube step to get qualityGate result
      agent any
      steps {
        script {
          timeout(time: 10, unit: 'MINUTES') {
            def qualityGate = waitForQualityGate()
            if (qualityGate.status != 'OK') {
              error "Pipeline aborted due to quality gate failure: ${qualityGate.status}"
            }
          }
        }
      }
    }
  }
  post {
    always {
      cleanWs()
    }
  }
}
