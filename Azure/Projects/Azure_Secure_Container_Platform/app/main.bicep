// --------------------------------------------------
// Parameters
// --------------------------------------------------

// Azure region to deploy resources into
param location string = 'eastus2'

// Azure Container Registry name
// IMPORTANT: ACR names must be globally unique
param acrName string = 'myuniqueacrname'

// User-assigned Managed Identity name
param managedIdentityName string = 'my-managed-identity'

// Azure Container Apps Environment name
param containerAppsEnvironmentName string = 'my-container-apps-environment'

// Azure Container App name
param containerAppName string = 'my-container-app'

// Log Analytics Workspace name
param logAnalyticsWorkspaceName string = 'my-log-analytics-workspace'

// Container image repository and tag
param containerImageRepository string = 'cloud-platform'
param containerImageTag string = 'v1'

// Full image path used by Azure Container Apps
param containerAppImage string = '${acrName}.azurecr.io/${containerImageRepository}:${containerImageTag}'

// Application port exposed by the container
param containerPort int = 8076

// Example application environment variable
param appEnvironmentName string = 'development'


// --------------------------------------------------
// Log Analytics Workspace
// --------------------------------------------------

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location

  properties: {
    retentionInDays: 30

    sku: {
      name: 'PerGB2018'
    }
  }
}


// --------------------------------------------------
// Azure Container Registry
// --------------------------------------------------

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location

  sku: {
    name: 'Basic'
  }

  properties: {
    // Disable the local admin account.
    // Managed Identity will be used for image pulls.
    adminUserEnabled: false
  }
}


// --------------------------------------------------
// User-Assigned Managed Identity
// --------------------------------------------------

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
}


// --------------------------------------------------
// ACR Pull RBAC Assignment
// --------------------------------------------------

// Built-in Azure AcrPull role
var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(
    acr.id,
    managedIdentity.id,
    acrPullRoleDefinitionId
  )

  scope: acr

  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}


// --------------------------------------------------
// Azure Container Apps Environment
// --------------------------------------------------

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location

  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'

      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}


// --------------------------------------------------
// Azure Container App
// --------------------------------------------------

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location

  identity: {
    type: 'UserAssigned'

    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }

  properties: {
    managedEnvironmentId: containerAppsEnvironment.id

    configuration: {
      ingress: {
        external: true
        targetPort: containerPort
        transport: 'auto'
      }

      registries: [
        {
          server: acr.properties.loginServer
          identity: managedIdentity.id
        }
      ]
    }

    template: {
      containers: [
        {
          name: 'cloud-platform'
          image: containerAppImage

          env: [
            {
              name: 'APP_ENVIRONMENT'
              value: appEnvironmentName
            }
          ]

          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]

      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }

  dependsOn: [
    acrPullRoleAssignment
  ]
}


// --------------------------------------------------
// Outputs
// --------------------------------------------------

output acrLoginServer string = acr.properties.loginServer

output managedIdentityPrincipalId string = managedIdentity.properties.principalId

output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
