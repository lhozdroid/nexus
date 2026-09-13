---
title: Code Best Practices
impact: LOW
impactDescription: Code quality and maintainability issues
tags: best-practices, code-quality, python, javascript
---

## Code Best Practices

These rules outline coding best practices across multiple languages. These patterns improve code quality, maintainability, and prevents common mistakes.

### File Handling - Always Close Files

**Insecure (Python):**

```python
def func1():
    fd = open('foo')
    x = 123
```

**Secure (Python - using context manager):**

```python
def func2():
    with open('bar', encoding='utf-8') as fd:
        data = fd.read()
```

### Specify File Encoding

`open()` uses device locale encodings by default. Always specify encoding in text mode.

**Insecure:**

```python
fd = open('foo', mode="w")
```

**Secure:**

```python
fd = open('foo', encoding='utf-8', mode="w")
```

### Network Requests Need Timeouts

Requests without a timeout will hang indefinitely if no response is received.

**Insecure (Python):**

```python
import requests
r = requests.get(url)
```

**Secure (Python):**

```python
r = requests.get(url, timeout=30)
```

### Remove Debug Statements

Debug statements like `alert()`, `confirm()`, `prompt()`, and `debugger` should not be in production code.

**Insecure (JavaScript):**

```javascript
var name = prompt('what is your name');
alert('your name is ' + name);
debugger;
```

### Load Modules at Top Level

Lazy loading inside functions complicates bundling and blocks requests synchronously in Node.js.

**Insecure (JavaScript):**

```javascript
function smth() {
  const mod = require('module-name')
  return mod();
}
```

**Secure (JavaScript):**

```javascript
const mod = require('module-name')
function smth() {
  return mod();
}
```

### Secure Temporary File Creation

File creation in shared tmp directories without proper APIs can lead to security vulnerabilities.

**Insecure (Python):**

```python
with open('/tmp/myfile.txt', 'w') as f:
    f.write(data)
```

**Secure (Python):**

```python
import tempfile
with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
    f.write(data)
```

### Cookie Security Flags

Always set `HttpOnly` and `Secure` flags on security-sensitive cookies.

**Insecure (JavaScript/Express):**

```javascript
res.cookie('session', value);
```

**Secure (JavaScript/Express):**

```javascript
res.cookie('session', value, { httpOnly: true, secure: true });
```

### Validate Redirect URLs

Never redirect to user-provided URLs without validation to prevent open redirect vulnerabilities.

**Insecure (JavaScript):**

```javascript
res.redirect(req.query.returnUrl);
```

**Secure (JavaScript):**

```javascript
const allowedHosts = ['example.com'];
const url = new URL(req.query.returnUrl, 'https://example.com');
if (allowedHosts.includes(url.hostname)) {
  res.redirect(url.href);
}
```

### Avoid Deprecated Libraries

Prefer actively maintained alternatives instead of deprecated libraries.

**Insecure (JavaScript - Moment.js is deprecated):**

```javascript
import moment from 'moment';
```

**Secure (JavaScript - use dayjs):**

```javascript
import dayjs from 'dayjs';
```
