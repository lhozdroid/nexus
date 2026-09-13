---
title: Prevent Prototype Pollution
impact: HIGH
impactDescription: Attackers can modify object prototypes to inject malicious properties
tags: security, prototype-pollution, cwe-915
---

## Prevent Prototype Pollution

Prototype pollution is a vulnerability that occurs when an attacker can modify the prototype of a base object, such as `Object.prototype` in JavaScript. This can create attributes that exist on every object or replace critical attributes with malicious ones.

**Mitigations:** Freeze prototypes with `Object.freeze(Object.prototype)`, use `Object.create(null)`, block `__proto__` and `constructor` keys, or use `Map` instead of objects.

**Insecure (JavaScript - dynamic property assignment from user input):**

```javascript
app.get('/test/:id', (req, res) => {
    let id = req.params.id;
    let items = req.session.todos[id];
    if (!items) {
        items = req.session.todos[id] = {};
    }
    items[req.query.name] = req.query.text;
    res.end(200);
});
```

**Secure (JavaScript - validate keys and use null-prototype objects):**

```javascript
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

app.post('/test/:id', (req, res) => {
    const id = req.params.id;
    const name = req.query.name;

    if (DANGEROUS_KEYS.has(id) || DANGEROUS_KEYS.has(name)) {
        return res.status(400).end();
    }

    let items = req.session.todos[id];
    if (!items) {
        items = req.session.todos[id] = Object.create(null);
    }
    items[name] = req.query.text;
    res.end(200);
});
```

**Insecure (JavaScript - nested property assignment in loop):**

```javascript
function setNestedValue(obj, props, value) {
  props = props.split('.');
  var lastProp = props.pop();
  while ((thisProp = props.shift())) {
    if (typeof obj[thisProp] == 'undefined') {
      obj[thisProp] = {};
    }
    obj = obj[thisProp];
  }
  obj[lastProp] = value;
}
```

**Secure (JavaScript - use numeric index or Map):**

```javascript
function safeIteration(name) {
  let config = this.config;
  name = name.split('.');
  for (let i = 0; i < name.length; i++) {
    config = config[i];
  }
  return this;
}
```

**Insecure (JavaScript - Object.assign with user input):**

```javascript
function controller(req, res) {
    const defaultData = {foo: true}
    let data = Object.assign(defaultData, req.body)
    doSmthWith(data)
}
```

**Secure (JavaScript - use trusted data sources):**

```javascript
function controller(req, res) {
    const defaultData = {foo: {bar: true}}
    let data = Object.assign(defaultData, {foo: getTrustedFoo()})
    doSmthWith(data)
}
```

**References:**
- CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes
- [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
