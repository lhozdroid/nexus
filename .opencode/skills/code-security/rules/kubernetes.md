---
title: Secure Kubernetes Configurations
impact: HIGH
impactDescription: Container escapes and cluster compromise
tags: security, kubernetes, k8s, containers, infrastructure, cwe-250
---

## Secure Kubernetes Configurations

These rules establish security practices for Kubernetes YAML configurations. These patterns help prevent common security misconfigurations that could expose the containers and cluster to attacks.

Key Security Principles:
1. Least Privilege: Containers should run with minimal permissions and as non-root users
2. Isolation: Limit host namespace sharing (PID, network, IPC) to prevent container escapes
3. Secrets Management: Never store secrets directly in configuration files

### Privileged Containers

Running containers in privileged mode grants full access to the host, bypassing security boundaries.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: nginx
      image: nginx
      securityContext:
        privileged: true
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: redis
      image: redis
      securityContext:
        privileged: false
```

### Run as Non-Root

Containers should never run as root to limit the impact of container escapes.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: false
  containers:
    - name: redis
      image: redis
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
  containers:
    - name: nginx
      image: nginx
```

### Privilege Escalation

Prevent processes from gaining more privileges than their parent process.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: redis
      image: redis
      securityContext:
        allowPrivilegeEscalation: true
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: haproxy
      image: haproxy
      securityContext:
        allowPrivilegeEscalation: false
```

### Host PID Namespace

Sharing the host PID namespace allows containers to see and interact with all processes on the host.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: view-pid
spec:
  hostPID: true
  containers:
    - name: nginx
      image: nginx
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  containers:
    - name: nginx
      image: nginx
```

### Host Network Namespace

Sharing the host network namespace exposes the host network stack to the container.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: view-network
spec:
  hostNetwork: true
  containers:
    - name: nginx
      image: nginx
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  containers:
    - name: nginx
      image: nginx
```

### Host IPC Namespace

Sharing the host IPC namespace allows containers to access shared memory on the host.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: view-ipc
spec:
  hostIPC: true
  containers:
    - name: nginx
      image: nginx
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  containers:
    - name: nginx
      image: nginx
```

### Docker Socket Exposure

Mounting the Docker socket gives containers full control over the Docker daemon.

**Insecure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - image: gcr.io/google_containers/test-webserver
      name: test-container
      volumeMounts:
        - mountPath: /var/run/docker.sock
          name: docker-sock-volume
  volumes:
    - name: docker-sock-volume
      hostPath:
        type: Socket
        path: /var/run/docker.sock
```

**Secure:**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - image: gcr.io/google_containers/test-webserver
      name: test-container
      volumeMounts:
        - mountPath: /data
          name: data-volume
  volumes:
    - name: data-volume
      emptyDir: {}
```

### Secrets in Config Files

Never store secrets directly in configuration files. Use external secrets management.

**Insecure:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
data:
  USERNAME: Y2FsZWJraW5uZXk=
  PASSWORD: UzNjcmV0UGEkJHcwcmQ=
```

**Secure (use Sealed Secrets or external secrets management):**

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
spec:
  encryptedData:
    password: AgBy8hCi8...encrypted...
```
