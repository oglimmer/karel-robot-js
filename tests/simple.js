

const {parse} = require('../src/interpreter');

test('simple_schritt_1', () => {
  const root = parse(["SCHRITT"]);
  expect(root.toString()).toBe("StepCommand");
});

test('simple_wendung_1', () => {
  const root = parse(["links-wendung"]);
  expect(root.toString()).toBe("TurnLeftCommand");
});

test('simple_schritt_2', () => {
  const root = parse([
    "SCHRITT", 
    "SCHRITT"
  ]);
  expect(root.toString()).toBe("StepCommand->StepCommand");
});

test('simple_schritt_3', () => {
  const root = parse([
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT", 
    "SCHRITT"
  ]);
  expect(root.toString()).toBe("StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand->StepCommand");
});

test('schritt_wendung_1', () => {
  const root = parse([
    "SCHRITT", 
    "LINKS-WENDUNG", 
    "SCHRITT", 
    "SCHRITT", 
    "LINKS-WENDUNG", 
    "LINKS-WENDUNG", 
    "SCHRITT", 
    "LINKS-WENDUNG", 
    "SCHRITT", 
    "SCHRITT", 
    "LINKS-WENDUNG", 
    "LINKS-WENDUNG", 
    "LINKS-WENDUNG", 
    "SCHRITT"
  ]);
  expect(root.toString()).toBe("StepCommand->TurnLeftCommand->StepCommand->StepCommand->TurnLeftCommand->TurnLeftCommand->StepCommand->TurnLeftCommand->StepCommand->StepCommand->TurnLeftCommand->TurnLeftCommand->TurnLeftCommand->StepCommand");
});
