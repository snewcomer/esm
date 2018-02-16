// Based on a similar API provided by ast-types.
// Copyright Ben Newman. Released under MIT license:
// https://github.com/benjamn/ast-types/blob/master/lib/path-visitor.js

import GenericArray from "./generic/array.js"
import GenericObject from "./generic/object.js"
import SafeWeakMap from "./builtin/weak-map.js"

import isObject from "./util/is-object.js"
import keys from "./util/keys.js"

const childNamesMap = new SafeWeakMap

const childrenToVisit = {
  __proto__: null,
  alternate: true,
  argument: true,
  arguments: true,
  block: true,
  body: true,
  callee: true,
  cases: true,
  consequent: true,
  declaration: true,
  declarations: true,
  elements: true,
  expression: true,
  expressions: true,
  init: true,
  left: true,
  object: true,
  properties: true,
  right: true,
  value: true
}

class Visitor {
  visit(path) {
    this.reset(...arguments)

    const possibleIndexes = this.possibleIndexes || []

    this.possibleEnd = possibleIndexes.length
    this.possibleIndexes = possibleIndexes
    this.possibleStart = 0

    this.visitWithoutReset(path)
  }

  visitWithoutReset(path) {
    const value = path.getValue()

    if (! isObject(value)) {
      return
    }

    if (GenericArray.isArray(value)) {
      path.each(this, "visitWithoutReset")
      return
    }

    // The method must call `this.visitChildren(path)` to continue traversing.
    let methodName = "visit" + value.type

    if (typeof this[methodName] !== "function") {
      methodName = "visitChildren"
    }

    this[methodName](path)
  }

  visitChildren(path) {
    const node = path.getValue()
    const names = getChildNames(node)

    const { end, start } = node
    const { possibleIndexes } = this

    const oldLeft = this.possibleStart
    const oldRight = this.possibleEnd

    let left = oldLeft
    let right = oldRight

    if (typeof start === "number" &&
        typeof end === "number") {
      // Find first index not less than `node.start`.
      while (left < right &&
          possibleIndexes[left] < start) {
        ++left
      }

      // Find first index not greater than `node.end`.
      while (left < right &&
          possibleIndexes[right - 1] > end) {
        --right
      }
    }

    if (left < right) {
      this.possibleStart = left
      this.possibleEnd = right

      for (const name of names) {
        path.call(this, "visitWithoutReset", name)
      }

      this.possibleStart = oldLeft
      this.possibleEnd = oldRight
    }
  }
}

function getChildNames(value) {
  let childNames = childNamesMap.get(value)

  if (childNames) {
    return childNames
  }

  const names = keys(value)
  childNames = []

  for (const name of names) {
    if (name in childrenToVisit &&
        isObject(value[name])) {
      childNames.push(name)
    }
  }

  childNamesMap.set(value, childNames)
  return childNames
}

GenericObject.setPrototypeOf(Visitor.prototype, null)

export default Visitor
