

const {parse} = require('../src/interpreter');

test('simple_wenn_1', () => {
  const root = parse(["wenn ist haus", "schritt", "ende"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:IST,cond:HomeCondition,stmt:StepCommand,else:undefined, ");
});

test('simple_wenn_nicht_1', () => {
  const root = parse(["wenn nicht haus", "schritt", "ende"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NICHT,cond:HomeCondition,stmt:StepCommand,else:undefined, ");
});

test('simple_wenn_sonst_1', () => {
  const root = parse(["wenn ist haus", "schritt", "ende, sonst", "schritt", "ende"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:IST,cond:HomeCondition,stmt:StepCommand,else:StepCommand, ");
});

test('simple_wenn_nicht_sonst_1', () => {
  const root = parse(["wenn nicht haus", "schritt", "ende, sonst", "schritt", "ende"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NICHT,cond:HomeCondition,stmt:StepCommand,else:StepCommand, ");
});

test('simple_wenn_nicht_sonst_2', () => {
  const root = parse(["wenn nicht haus", "schritt", "log \"mega\"", "schritt", "ende, sonst", "schritt", "schritt", "schritt", "ende"]);
  expect(root.toString()).toBe("IfCondition::conHandler:ConditionHandler::op:NICHT,cond:HomeCondition,stmt:StepCommand->LogCommand::message:\"MEGA\", ->StepCommand,else:StepCommand->StepCommand->StepCommand, ");
});
