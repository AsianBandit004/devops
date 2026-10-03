# V1 Validation Checklist

Use this checklist before publishing the repository or calling the V1 lab complete.

## Repository safety

- [ ] No subscription IDs, tenant IDs, principal IDs, resource IDs, passwords, tokens, or secret values are committed.
- [ ] Screenshots do not expose account names, email addresses, public IP addresses, secret values, or full Azure resource IDs.
- [ ] Local `.env` files and Azure CLI profile files are ignored.

## Local application

- [ ] `docker buildx build --platform linux/amd64 --load -t cloud-platform:v1 .` succeeds from `app/`.
- [ ] The image reports `linux/amd64` when inspected.
- [ ] The container starts with `APP_ENVIRONMENT=homelab` and publishes port `8077`.
- [ ] `GET /` returns `environment`, `message`, and `status`.
- [ ] `GET /health` returns HTTP `200` and `{"status":"healthy"}`.

## Azure resources

- [ ] ACR contains repository `cloud-platform` with tag `v1`.
- [ ] The ACR admin account is disabled.
- [ ] The user-assigned managed identity is attached to the Container App.
- [ ] The identity has one `AcrPull` assignment scoped to the registry.
- [ ] The Container Apps environment provisioning state is `Succeeded`.
- [ ] External ingress targets port `8077` and HTTPS is enforced.
- [ ] Minimum replicas is `0`; maximum replicas is `1` for the lab.
- [ ] `APP_ENVIRONMENT` is set to `azure`.
- [ ] The public root and health endpoints return successfully.
- [ ] Container output is visible in Log Analytics or the Container App log stream.

## Key Vault preparation

- [ ] The vault uses Azure RBAC authorization.
- [ ] The workload identity has `Key Vault Secrets User` scoped to the vault.
- [ ] The human operator has only the data-plane role needed to create/manage the lab secret.
- [ ] The Container App has a Key Vault-backed secret reference and an `APP_MESSAGE` secret-backed environment variable.
- [ ] The V1 README clearly states that application-level secret consumption is deferred to V2.

## Cost controls

- [ ] A budget and alerts exist at the chosen scope.
- [ ] The lab uses ACR Basic and the Container Apps Consumption plan.
- [ ] Log ingestion is checked after testing.
- [ ] The resource group contains only disposable lab resources before teardown.

