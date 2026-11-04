import {
  assert,
  debugAssert,
  nonProductionConditionalsIncluded,
} from "@fluidframework/core-utils/internal";
import { SchemaFactory } from "@fluidframework/tree";

export function run(value) {
  let predicateCalls = 0;
  debugAssert(() => {
    predicateCalls++;
    throw new Error("FLUID_CALLBACK_BODY");
  });
  return { value, predicateCalls };
}

export function runFactory() {
  let factoryCalls = 0;
  let predicateCalls = 0;
  function makeCallback() {
    factoryCalls++;
    return () => {
      predicateCalls++;
      return true;
    };
  }
  debugAssert(makeCallback());
  return { factoryCalls, predicateCalls };
}

export function runTree() {
  const factory = new SchemaFactory("repro");
  const Note = factory.object("Note", { title: factory.string });
  const Notes = factory.array(Note);
  const notes = new Notes([{ title: "before" }]);
  notes[0].title = "after";
  notes.insertAtEnd(new Note({ title: "second" }));
  return {
    included: nonProductionConditionalsIncluded(),
    titles: Array.from(notes, (note) => note.title),
  };
}

export function runtimeAssert() {
  assert(false, 0x123);
}
