import { useEffect, useRef, useState } from 'react';

interface BlocklyEditorProps {
  onChange: (code: string) => void;
}

export default function BlocklyEditor({ onChange }: BlocklyEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Blockly = (await import('blockly')) as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { pythonGenerator } = (await import('blockly/python')) as any;

        if (!mounted || !containerRef.current) return;

        // ── Scratch-exact colour palette (DO NOT CHANGE THESE VALUES) ─────
        const SCRATCH = {
          control:   '#FFAB19',
          operators: '#59C059',
          variables: '#FF8C1A',
          looks:     '#9966FF',
          lists:     '#4C97FF',
          myBlocks:  '#FF6680',
        };

        // ── ORDER MATTERS: define custom blocks BEFORE injecting workspace ─

        // ── 1. CONTROL BLOCKS ─────────────────────────────────────────────

        // "repeat () times" — exact Scratch phrasing, generates a for loop
        Blockly.Blocks['scratch_repeat'] = {
          init() {
            this.jsonInit({
              type: 'scratch_repeat',
              message0: 'repeat %1 times',
              args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }],
              message1: '%1',
              args1: [{ type: 'input_statement', name: 'DO' }],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.control,
              tooltip: 'Repeat a set of actions a number of times.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_repeat'] = function (block: any, generator: any) {
          const times = generator.valueToCode(block, 'TIMES', 0) || '10';
          const branch = generator.statementToCode(block, 'DO');
          return `for _ in range(${times}):\n${branch || `${generator.INDENT}pass\n`}`;
        };

        // "repeat forever" — generates while True:
        Blockly.Blocks['scratch_forever'] = {
          init() {
            this.jsonInit({
              type: 'scratch_forever',
              message0: 'repeat forever',
              message1: '%1',
              args1: [{ type: 'input_statement', name: 'DO' }],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.control,
              tooltip: 'Keep repeating forever (while True).',
            });
          },
        };
        pythonGenerator.forBlock['scratch_forever'] = function (block: any, generator: any) {
          const branch = generator.statementToCode(block, 'DO');
          return `while True:\n${branch || `${generator.INDENT}pass\n`}`;
        };

        // ── 2. OPERATOR BLOCKS ────────────────────────────────────────────

        // "() mod ()" — exact Scratch phrasing for modulo/remainder
        Blockly.Blocks['scratch_mod'] = {
          init() {
            this.jsonInit({
              type: 'scratch_mod',
              message0: '%1 mod %2',
              args0: [
                { type: 'input_value', name: 'DIVIDEND', check: 'Number' },
                { type: 'input_value', name: 'DIVISOR',  check: 'Number' },
              ],
              output: 'Number',
              colour: SCRATCH.operators,
              tooltip: 'Remainder after division (e.g. 7 mod 2 = 1).',
            });
          },
        };
        pythonGenerator.forBlock['scratch_mod'] = function (block: any, generator: any) {
          const dividend = generator.valueToCode(block, 'DIVIDEND', 0) || '0';
          const divisor  = generator.valueToCode(block, 'DIVISOR',  0) || '1';
          return [`(${dividend}) % (${divisor})`, 0];
        };

        // "pick random () to ()" — exact Scratch phrasing
        Blockly.Blocks['scratch_pick_random'] = {
          init() {
            this.jsonInit({
              type: 'scratch_pick_random',
              message0: 'pick random %1 to %2',
              args0: [
                { type: 'input_value', name: 'FROM', check: 'Number' },
                { type: 'input_value', name: 'TO',   check: 'Number' },
              ],
              output: 'Number',
              colour: SCRATCH.operators,
              tooltip: 'Pick a random whole number between two values (inclusive).',
            });
          },
        };
        pythonGenerator.forBlock['scratch_pick_random'] = function (block: any, generator: any) {
          generator.definitions_['import_random'] = 'import random';
          const from = generator.valueToCode(block, 'FROM', 0) || '1';
          const to   = generator.valueToCode(block, 'TO',   0) || '10';
          return [`random.randint(${from}, ${to})`, 0];
        };

        // "join () ()" — exact Scratch phrasing for string concatenation
        Blockly.Blocks['scratch_join'] = {
          init() {
            this.jsonInit({
              type: 'scratch_join',
              message0: 'join %1 %2',
              args0: [
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
              ],
              output: 'String',
              colour: SCRATCH.operators,
              tooltip: 'Join two pieces of text together.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_join'] = function (block: any, generator: any) {
          const a = generator.valueToCode(block, 'A', 0) || "''";
          const b = generator.valueToCode(block, 'B', 0) || "''";
          return [`str(${a}) + str(${b})`, 0];
        };

        // "length of ()" — Scratch phrasing for len()
        Blockly.Blocks['scratch_length_of'] = {
          init() {
            this.jsonInit({
              type: 'scratch_length_of',
              message0: 'length of %1',
              args0: [{ type: 'input_value', name: 'TEXT' }],
              output: 'Number',
              colour: SCRATCH.operators,
              tooltip: 'The number of letters in a piece of text.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_length_of'] = function (block: any, generator: any) {
          const text = generator.valueToCode(block, 'TEXT', 0) || "''";
          return [`len(${text})`, 0];
        };

        // "letter () of ()" — exact Scratch phrasing (1-indexed like Scratch)
        Blockly.Blocks['scratch_letter_of'] = {
          init() {
            this.jsonInit({
              type: 'scratch_letter_of',
              message0: 'letter %1 of %2',
              args0: [
                { type: 'input_value', name: 'INDEX', check: 'Number' },
                { type: 'input_value', name: 'TEXT'  },
              ],
              output: 'String',
              colour: SCRATCH.operators,
              tooltip: 'Get a single letter from a piece of text. Letter 1 is the first letter.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_letter_of'] = function (block: any, generator: any) {
          const index = generator.valueToCode(block, 'INDEX', 0) || '1';
          const text  = generator.valueToCode(block, 'TEXT',  0) || "''";
          // Scratch is 1-indexed; Python is 0-indexed
          return [`${text}[int(${index}) - 1]`, 0];
        };

        // "() contains ()" — exact Scratch phrasing for the 'in' operator
        Blockly.Blocks['scratch_contains'] = {
          init() {
            this.jsonInit({
              type: 'scratch_contains',
              message0: '%1 contains %2',
              args0: [
                { type: 'input_value', name: 'STRING' },
                { type: 'input_value', name: 'SUBSTRING' },
              ],
              output: 'Boolean',
              colour: SCRATCH.operators,
              tooltip: 'True if the first text contains the second text.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_contains'] = function (block: any, generator: any) {
          const string    = generator.valueToCode(block, 'STRING',    0) || "''";
          const substring = generator.valueToCode(block, 'SUBSTRING', 0) || "''";
          return [`(${substring} in ${string})`, 0];
        };

        // ── 3. LOOKS / OUTPUT BLOCKS ──────────────────────────────────────

        // "say ()" — exact Scratch phrasing for print()
        Blockly.Blocks['scratch_say'] = {
          init() {
            this.jsonInit({
              type: 'scratch_say',
              message0: 'say %1',
              args0: [{ type: 'input_value', name: 'TEXT' }],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.looks,
              tooltip: 'Print a value to the console (same as Python\'s print()).',
            });
          },
        };
        pythonGenerator.forBlock['scratch_say'] = function (block: any, generator: any) {
          const text = generator.valueToCode(block, 'TEXT', 0) || "''";
          return `print(${text})\n`;
        };

        // "say () and ()" — very common Scratch pattern: print a label + a value together
        Blockly.Blocks['scratch_say_join'] = {
          init() {
            this.jsonInit({
              type: 'scratch_say_join',
              message0: 'say %1 and %2',
              args0: [
                { type: 'input_value', name: 'A' },
                { type: 'input_value', name: 'B' },
              ],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.looks,
              tooltip: 'Print two values joined together (e.g. a label and a number).',
            });
          },
        };
        pythonGenerator.forBlock['scratch_say_join'] = function (block: any, generator: any) {
          const a = generator.valueToCode(block, 'A', 0) || "''";
          const b = generator.valueToCode(block, 'B', 0) || "''";
          return `print(str(${a}) + str(${b}))\n`;
        };

        // ── 4. LIST BLOCKS ────────────────────────────────────────────────

        // "item () of []" — exact Scratch phrasing (1-indexed like Scratch)
        Blockly.Blocks['scratch_list_item'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_item',
              message0: 'item %1 of %2',
              args0: [
                { type: 'input_value', name: 'INDEX', check: 'Number' },
                { type: 'input_value', name: 'LIST'  },
              ],
              output: null,
              colour: SCRATCH.lists,
              tooltip: 'Get an item from a list by its position. Item 1 is the first item.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_item'] = function (block: any, generator: any) {
          const index = generator.valueToCode(block, 'INDEX', 0) || '1';
          const list  = generator.valueToCode(block, 'LIST',  0) || '[]';
          return [`${list}[int(${index}) - 1]`, 0];
        };

        // "add () to []" — exact Scratch phrasing for list.append()
        Blockly.Blocks['scratch_list_add'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_add',
              message0: 'add %1 to %2',
              args0: [
                { type: 'input_value', name: 'ITEM' },
                { type: 'input_value', name: 'LIST' },
              ],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.lists,
              tooltip: 'Add an item to the end of a list.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_add'] = function (block: any, generator: any) {
          const item = generator.valueToCode(block, 'ITEM', 0) || "''";
          const list = generator.valueToCode(block, 'LIST', 0) || '[]';
          return `${list}.append(${item})\n`;
        };

        // "delete () of []" — exact Scratch phrasing for del list[i]
        Blockly.Blocks['scratch_list_delete'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_delete',
              message0: 'delete %1 of %2',
              args0: [
                { type: 'input_value', name: 'INDEX', check: 'Number' },
                { type: 'input_value', name: 'LIST'  },
              ],
              previousStatement: null,
              nextStatement: null,
              colour: SCRATCH.lists,
              tooltip: 'Delete an item from a list by its position.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_delete'] = function (block: any, generator: any) {
          const index = generator.valueToCode(block, 'INDEX', 0) || '1';
          const list  = generator.valueToCode(block, 'LIST',  0) || '[]';
          return `del ${list}[int(${index}) - 1]\n`;
        };

        // "length of []" — exact Scratch phrasing for len(list)
        Blockly.Blocks['scratch_list_length'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_length',
              message0: 'length of %1',
              args0: [{ type: 'input_value', name: 'LIST' }],
              output: 'Number',
              colour: SCRATCH.lists,
              tooltip: 'The number of items in a list.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_length'] = function (block: any, generator: any) {
          const list = generator.valueToCode(block, 'LIST', 0) || '[]';
          return [`len(${list})`, 0];
        };

        // "[] contains ()" — exact Scratch phrasing
        Blockly.Blocks['scratch_list_contains'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_contains',
              message0: '%1 contains %2',
              args0: [
                { type: 'input_value', name: 'LIST' },
                { type: 'input_value', name: 'ITEM' },
              ],
              output: 'Boolean',
              colour: SCRATCH.lists,
              tooltip: 'True if the list contains this item.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_contains'] = function (block: any, generator: any) {
          const item = generator.valueToCode(block, 'ITEM', 0) || "''";
          const list = generator.valueToCode(block, 'LIST', 0) || '[]';
          return [`(${item} in ${list})`, 0];
        };

        // "sum of []" — no direct Scratch equivalent, but needed for challenge ch_009
        // Label it clearly so Python students understand what it does
        Blockly.Blocks['scratch_list_sum'] = {
          init() {
            this.jsonInit({
              type: 'scratch_list_sum',
              message0: 'sum of %1',
              args0: [{ type: 'input_value', name: 'LIST' }],
              output: 'Number',
              colour: SCRATCH.lists,
              tooltip: 'Add up all the numbers in a list.',
            });
          },
        };
        pythonGenerator.forBlock['scratch_list_sum'] = function (block: any, generator: any) {
          const list = generator.valueToCode(block, 'LIST', 0) || '[]';
          return [`sum(${list})`, 0];
        };

        // ── 5. TOOLBOX — Scratch semantic structure ────────────────────────
        const toolbox = {
          kind: 'categoryToolbox',
          contents: [
            // Control — loops + conditionals, exactly like Scratch's Control category
            {
              kind: 'category',
              name: '🟠 Control',
              colour: SCRATCH.control,
              contents: [
                { kind: 'block', type: 'scratch_repeat' },
                { kind: 'block', type: 'scratch_forever' },
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'controls_ifelse' },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for' },
                { kind: 'block', type: 'controls_flow_statements' },
              ],
            },

            // Operators — math, logic, text ops, random. Matches Scratch's Operators exactly.
            {
              kind: 'category',
              name: '🟢 Operators',
              colour: SCRATCH.operators,
              contents: [
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'scratch_mod' },
                { kind: 'block', type: 'math_round' },
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' },
                { kind: 'block', type: 'scratch_pick_random' },
                { kind: 'block', type: 'scratch_join' },
                { kind: 'block', type: 'scratch_length_of' },
                { kind: 'block', type: 'scratch_letter_of' },
                { kind: 'block', type: 'scratch_contains' },
              ],
            },

            // Variables — Blockly dynamic category, generates set/change/read blocks
            {
              kind: 'category',
              name: '🟡 Variables',
              colour: SCRATCH.variables,
              custom: 'VARIABLE',
            },

            // Looks — "say ()" maps to print(); matches Scratch's Looks → say/think pattern
            {
              kind: 'category',
              name: '🟣 Looks',
              colour: SCRATCH.looks,
              contents: [
                { kind: 'block', type: 'scratch_say' },
                { kind: 'block', type: 'scratch_say_join' },
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'math_number' },
              ],
            },

            // Lists — Python lists with Scratch-familiar phrasing
            {
              kind: 'category',
              name: '🔵 Lists',
              colour: SCRATCH.lists,
              contents: [
                { kind: 'block', type: 'lists_create_with' },
                { kind: 'block', type: 'scratch_list_item' },
                { kind: 'block', type: 'scratch_list_add' },
                { kind: 'block', type: 'scratch_list_delete' },
                { kind: 'block', type: 'scratch_list_length' },
                { kind: 'block', type: 'scratch_list_contains' },
                { kind: 'block', type: 'scratch_list_sum' },
              ],
            },

            // My Blocks — Blockly dynamic category, generates def/call blocks
            {
              kind: 'category',
              name: '🩷 My Blocks',
              colour: SCRATCH.myBlocks,
              custom: 'PROCEDURE',
            },
          ],
        };

        // ── 6. Override built-in block colours to match Scratch categories ─
        const controlBuiltins  = ['controls_if', 'controls_ifelse', 'controls_whileUntil', 'controls_for', 'controls_flow_statements'];
        const operatorBuiltins = ['math_arithmetic', 'math_round', 'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean'];
        const listBuiltins     = ['lists_create_with', 'lists_create_empty', 'lists_repeat', 'lists_length', 'lists_getIndex', 'lists_setIndex', 'lists_indexOf', 'lists_isEmpty'];
        const looksBuiltins    = ['text', 'text_print', 'text_join'];

        controlBuiltins.forEach( t => { if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.control;   });
        operatorBuiltins.forEach(t => { if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.operators; });
        listBuiltins.forEach(    t => { if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.lists;     });
        looksBuiltins.forEach(   t => { if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.looks;     });

        // ── 7. Dark theme (unchanged from original — do not modify) ────────
        const scratchTheme = Blockly.Theme.defineTheme('scratchTheme', {
          base: Blockly.Themes.Classic,
          blockStyles: {
            logic_blocks:    { colourPrimary: SCRATCH.control,   colourSecondary: '#CF8B17', colourTertiary: '#CF8B17' },
            loop_blocks:     { colourPrimary: SCRATCH.control,   colourSecondary: '#CF8B17', colourTertiary: '#CF8B17' },
            math_blocks:     { colourPrimary: SCRATCH.operators, colourSecondary: '#389438', colourTertiary: '#389438' },
            text_blocks:     { colourPrimary: SCRATCH.looks,     colourSecondary: '#7D52CC', colourTertiary: '#7D52CC' },
            list_blocks:     { colourPrimary: SCRATCH.lists,     colourSecondary: '#3A7DE0', colourTertiary: '#3A7DE0' },
            variable_blocks: { colourPrimary: SCRATCH.variables, colourSecondary: '#CF6D00', colourTertiary: '#CF6D00' },
            variable_dynamic_blocks: { colourPrimary: SCRATCH.variables, colourSecondary: '#CF6D00', colourTertiary: '#CF6D00' },
            procedure_blocks: { colourPrimary: SCRATCH.myBlocks, colourSecondary: '#CC4466', colourTertiary: '#CC4466' },
          },
          componentStyles: {
            workspaceBackgroundColour: '#1E1E2E',
            toolboxBackgroundColour:   '#2A1F3D',
            toolboxForegroundColour:   '#FFFFFF',
            flyoutBackgroundColour:    '#332547',
            flyoutForegroundColour:    '#FFFFFF',
            flyoutOpacity:             0.97,
            scrollbarColour:           '#9966FF',
            scrollbarOpacity:          0.6,
            insertionMarkerColour:     '#FFFFFF',
            insertionMarkerOpacity:    0.3,
            markerColour:              '#FFFFFF',
            cursorColour:              '#FFAB19',
          },
          fontStyle: {
            family: '"Nunito", "Segoe UI", sans-serif',
            weight: '700',
            size:   11,
          },
        });

        // ── 8. Inject workspace ────────────────────────────────────────────
        workspaceRef.current = Blockly.inject(containerRef.current, {
          toolbox,
          theme:    scratchTheme,
          renderer: 'zelos',
          scrollbars: true,
          trashcan:   true,
          zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2, minScale: 0.4, scaleSpeed: 1.2 },
          move: { scrollbars: true, drag: true, wheel: true },
          grid: { spacing: 24, length: 3, colour: '#3A2D5A', snap: true },
        });

        workspaceRef.current.addChangeListener(() => {
          const code = pythonGenerator.workspaceToCode(workspaceRef.current);
          onChangeRef.current(code);
        });

        setLoaded(true);
      } catch (e) {
        console.error('Blockly load error', e);
        if (mounted) setError(true);
      }
    })();

    return () => {
      mounted = false;
      workspaceRef.current?.dispose();
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-space-950 rounded-xl text-status-danger text-sm font-body p-4 text-center">
        <div>
          <p className="font-semibold mb-1">Blocks mode unavailable</p>
          <p className="text-white/50 text-xs">Switch to CODE mode to continue coding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E1E2E] rounded-xl z-10 gap-3">
          <div className="flex gap-2">
            {['#FFAB19', '#59C059', '#9966FF', '#4C97FF', '#FF8C1A'].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 12, height: 12, borderRadius: 3,
                  backgroundColor: c,
                  animation: `bounce 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <p className="text-white/60 font-bold text-xs tracking-widest uppercase">Loading Scratch Blocks…</p>
          <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-8px); } }`}</style>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </div>
  );
}
