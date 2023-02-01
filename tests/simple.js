

import { parse } from '../src/interpreter.js';

test('simple_schritt_1', () => {
  const root = parse(["MOVE"]);
  expect(root.toString()).toBe("StepCommand");
});

test('simple_wendung_1', () => {
  const root = parse(["turnleft"]);
  expect(root.toString()).toBe("TurnLeftCommand");
});

test('simple_schritt_2', () => {
  const root = parse([
    "MOVE", 
    "MOVE"
  ]);
  expect(root.toString()).toBe("StepCommand->StepCommand");
});

test('simple_schritt_3', () => {
  const root = parse([
    "MOVE", 
    "MOVE", 
    "MOVE", 
    "MOVE", 
    "MOVE", 
    "MOVE", 
    "MOVE", 
    "MOVE"
  ]);
  expect(root.toString()).toBe("StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand");
});

test('schritt_wendung_1', () => {
  const root = parse([
    "MOVE", 
    "TURNLEFT", 
    "MOVE", 
    "MOVE", 
    "TURNLEFT", 
    "TURNLEFT", 
    "MOVE", 
    "TURNLEFT", 
    "MOVE", 
    "MOVE", 
    "TURNLEFT", 
    "TURNLEFT", 
    "TURNLEFT", 
    "MOVE"
  ]);
  expect(root.toString()).toBe("StepCommand->TurnLeftCommand->StepCommand->StepCommand->TurnLeftCommand->TurnLeftCommand->StepCommand->TurnLeftCommand->StepCommand->StepCommand->TurnLeftCommand->TurnLeftCommand->TurnLeftCommand->StepCommand");
});
