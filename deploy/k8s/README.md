# openGym en k3s

Aplica el bootstrap (namespace, RBAC, cuotas y NetworkPolicy) una sola vez.
El Ingress y el Secret reales se crean en el servidor con el host verdadero; no se
versionan aquí.

```sh
kubectl apply -f opengym-bootstrap.yaml
kubectl apply -f data-pvc.yaml
kubectl apply -f env.yaml          # copia de env.example.yaml
kubectl apply -f api.yaml -f web.yaml
kubectl apply -f ingress.yaml      # copia de ingress.example.yaml
```

El CI solo actualiza las imágenes de los Deployments con `kubectl set image` y un
digest; no crea ni borra PVC, Secret ni Ingress.
