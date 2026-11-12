// Copies the methods (and getters) of one or more classes onto a target class. A large class such as Game is written
// in several files this way: every file holds one concern, and every method still reaches the shared state as `this`.
export function mixin(target, ...sources) {
  for (const src of sources)
    for (const key of Object.getOwnPropertyNames(src.prototype))
      if (key !== 'constructor') Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(src.prototype, key));
}
