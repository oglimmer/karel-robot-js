

const {parse} = require('../src/interpreter');

test('loop_1', () => {
  const root = parse(["WIEDERHOLE", "3-mal", "schritt", "ende"]);
  expect(root.toString()).toBe("LoopCounterCommand::couter:3,conditionalStatement:StepCommand, ");
});

test('loop_2', () => {
  const root = parse(["WIEDERHOLE", "3-mal", "schritt", "schritt", "schritt", "ende"]);
  expect(root.toString()).toBe("LoopCounterCommand::couter:3,conditionalStatement:StepCommand->StepCommand->StepCommand, ");
});

test('loop_aslongas_1', () => {
  const root = parse(["WIEDERHOLE", "solange", "ist", "haus", "schritt", "ende"]);
  expect(root.toString()).toBe("LoopConditionCommand::conHandler:ConditionHandler::op:IST,cond:HomeCondition,conditionalStatement:StepCommand, ");
});

test('loop_aslongas_nicht_1', () => {
  const root = parse(["WIEDERHOLE", "solange", "nicht", "haus", "schritt", "ende"]);
  expect(root.toString()).toBe("LoopConditionCommand::conHandler:ConditionHandler::op:NICHT,cond:HomeCondition,conditionalStatement:StepCommand, ");
});
