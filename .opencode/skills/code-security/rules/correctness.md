---
title: Code Correctness
impact: MEDIUM
impactDescription: Runtime errors and unexpected behavior
tags: correctness, bugs, python, javascript, java, go, c
---

# Code Correctness Rules

Common coding mistakes that cause runtime errors, unexpected behavior, or logic issues.

---

## Python

### Mutable Default Arguments

Python only instantiates default arguments once. Mutating them affects all future calls.

**INSECURE**:
```python
def append_func(default=[]):
    default.append(5)
```

**SECURE**:
```python
def append_func(default=None):
    if default is None:
        default = []
    default.append(5)
```

### Modifying Collections While Iterating

**INSECURE**:
```python
items = [1, 2, 3, 4]
for i in items:
    items.pop(0)
```

**SECURE**:
```python
for i in list(items):  # Iterate over a copy
    items.pop(0)
```

### Suppressed Exceptions in Finally

Using `break`, `continue`, or `return` in `finally` suppresses exceptions.

**INSECURE**:
```python
try:
    raise ValueError()
finally:
    break  # Suppresses the exception!
```

**SECURE** - Let the exception propagate; use finally only for cleanup:
```python
try:
    raise ValueError()
finally:
    cleanup()  # Cleanup runs, exception still propagates
```

### Raising Non-Exceptions

**INSECURE**:
```python
raise "error"
```

**SECURE**:
```python
raise Exception("error")
```

### String Concatenation in Lists

Missing commas cause implicit string concatenation.

**INSECURE**:
```python
bad = ["a" "b" "c"]  # Results in ["abc"]
```

**SECURE**:
```python
good = ["a", "b", "c"]
```

---

## JavaScript

### Missing Template String $

**INSECURE**:
```javascript
return `value is {x}`  // Missing $
```

**SECURE**:
```javascript
return `value is ${x}`
```

---

## Go

### Loop Pointer Export

> **Note:** Go 1.22+ scopes loop variables per-iteration, fixing this issue. The pattern below applies to Go < 1.22.

Loop variables are shared across iterations (Go < 1.22).

**INSECURE**:
```go
for _, val := range values {
    funcs = append(funcs, func() {
        fmt.Println(&val)  // Same pointer for all!
    })
}
```

**SECURE**:
```go
for _, val := range values {
    val := val  // Create new variable
    funcs = append(funcs, func() {
        fmt.Println(&val)
    })
}
```

### Integer Overflow from Atoi

**INSECURE**:
```go
bigValue, _ := strconv.Atoi("2147483648")
value := int16(bigValue)  // Overflow!
```

**SECURE**:
```go
parsed, err := strconv.ParseInt("2147483648", 10, 32)
if err != nil {
    // handles out-of-range and invalid syntax
    log.Fatal(err)
}
value := int32(parsed)
```

---

## Java

### String Comparison with ==

**INSECURE**:
```java
if (a == "hello") return 1;
```

**SECURE**:
```java
if ("hello".equals(a)) return 1;
```

### Assignment in Condition

**INSECURE**:
```java
if (myBoolean = true) {  // Assignment, not comparison!
```

**SECURE**:
```java
if (myBoolean) {
```

---

## C

### ato* Functions

The `ato*()` functions cause undefined behavior on overflow.

**INSECURE**:
```c
int i = atoi(buf);
```

**SECURE**:
```c
char *endptr;
errno = 0;
long l = strtol(buf, &endptr, 10);
if (errno != 0 || endptr == buf || *endptr != '\0') {
    // handle conversion error
}
```

---

## Bash

### Unquoted Variable Expansion

Unquoted variables split on whitespace.

**INSECURE**:
```bash
exec $foo
```

**SECURE**:
```bash
exec "$foo"
```

---

## Other Languages

### Scala: indexOf > 0 Bug

**INSECURE**:
```scala
if (list.indexOf(item) > 0)  // Misses first element!
```

**SECURE**:
```scala
if (list.indexOf(item) >= 0)
```

### Elixir: Atom Exhaustion

Atoms are never garbage collected. Use `String.to_existing_atom` instead of `String.to_atom`.

### OCaml: Physical vs Structural Equality

Use `=` not `==` for value comparison, `<>` not `!=` for inequality.
