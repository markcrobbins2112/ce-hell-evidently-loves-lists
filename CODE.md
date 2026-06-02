# Code

## Go to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- ▪️[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- 🔸[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- ▪️[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)

## Implementation Guidelines
- **Encoding Safety**: Preserve UTF-8 encoding and avoid bulk read/write rewrites of files that can corrupt emoji/icon literals (mojibake).
- Prefer small targeted patches, and after icon-related edits run lint and quickly verify shared icon constants still render correctly.


### Markdown
- Use dashes instead of asterisks for bullet items
- AGENTS: never ever change an [X], never use an [X] always use lowercase [x] when completing a task
- Always update UPPERCASE.md files (such as AITASKS.md, AILOG.md, etc.) when tasks are completed or work is performed
- Put all chat task requests from the user on AITASKS.md first before working on them
- If the user says 'do tasks', always state what you are going to do and then wait for the user's adjustments and approval before proceeding
- AILOG: The top of AILOG.md should always feature a "Commit Message" section maintained by the AI, which must be cleared whenever the user says they have committed or appended the changes
- Bullets and everything indented, use tabs

### Javascript, Typescript Coding Style
- **Indentation**: Use tabs for indentation.
- **Braces**: Always use braces for control structures (if, for, while, etc.).

#### Typescript Code Style
- use <https://google.github.io/styleguide/tsguide.html#container-classes>
  - except Container Classes - which we want

#### Container Classes
```js
class TheContainer {
	static const val = 1;
	static fn() {}
}
```
- but no globals
```js
const val = TheContainer.val;
const fn = TheContainer.fn;
```
- use like this
```js
function x() {
	const Tc_ = TheContainer;
	Tc_.fn();
}
```
- not like this
```js
function x() {
	TheContainer.fn();
}
```

#### Static methods
- Use static methods
```js
class StaticMethods() {
	static method() {}
}
```
- not
```js
StaticMethods.method = function () {}
```

#### Avoid static this references
- this is fine, allowed

#### JsDocs

##### Use when possible
- @exports
- @imports

- @param
- @returns
- @callback
- @throws

- @enum
- @type
- @typedef

- @global
- @class
- @extends
- @static
- @private
- @protected
- @public
- @override
- @readonly
- @satisfiees
- @template

- @constructor
- @var
- @member
- @memberof
- @property

- @see
- @todo
- @example

##### Types of class members
- use @var for members that are values
- use @member for members that are functions
- use @property for members that are get/set


##### Type Expressions
- always use type expressions in jsdocs
  - @member {readonly ActionsTargetTypes} allowedTargetTypes

##### JsDoc Layout
```js
/** {brief title}
 * {long description}
 * {more}
 * {@example}
 * {@see}
 */
```

#### Global Function Ordering
- if in a region, order by dependency within the region, meaning a function is listed after the ones it is dependent on
- not in a region, order by dependency
- if no dependencies, order alphabetically

### Regions
- classes are to be kept in a region named _classes
- classes are to be wrapped in a region named _class_{classname}

#### Regions inside classes
- _class_{classname}_types
- _class_{classname}_vars
- _class_{classname}_properties
- _class_{classname}_members
- _class_{classname}_ctor
- _class_{classname}_functions
---
## Go back to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- ▪️[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- 🔸[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- ▪️[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)
