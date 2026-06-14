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

        // ── Scratch-exact colour palette ──────────────────────────────────
        const SCRATCH = {
          control:   '#FFAB19', // Control  — orange
          operators: '#59C059', // Operators — green
          variables: '#FF8C1A', // Variables — orange-red
          looks:     '#9966FF', // Looks (print/say) — purple
          sensing:   '#5CB1D6', // Sensing  — cyan
          motion:    '#4C97FF', // Motion / loops — blue
          events:    '#FFBF00', // Events   — yellow-gold
          myBlocks:  '#FF6680', // My Blocks — pink-red
        };

        // ── Toolbox — Scratch category names & colours ────────────────────
        const toolbox = {
          kind: 'categoryToolbox',
          contents: [
            {
              kind: 'category',
              name: '🟠 Control',
              colour: SCRATCH.control,
              contents: [
                { kind: 'block', type: 'controls_if' },
                { kind: 'block', type: 'controls_ifelse' },
                { kind: 'block', type: 'controls_repeat_ext' },
                { kind: 'block', type: 'controls_whileUntil' },
                { kind: 'block', type: 'controls_for' },
                { kind: 'block', type: 'controls_flow_statements' },
              ],
            },
            {
              kind: 'category',
              name: '🟢 Operators',
              colour: SCRATCH.operators,
              contents: [
                { kind: 'block', type: 'math_arithmetic' },
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_modulo' },
                { kind: 'block', type: 'math_round' },
                { kind: 'block', type: 'logic_compare' },
                { kind: 'block', type: 'logic_operation' },
                { kind: 'block', type: 'logic_negate' },
                { kind: 'block', type: 'logic_boolean' },
              ],
            },
            {
              kind: 'category',
              name: '🟡 Variables',
              colour: SCRATCH.variables,
              custom: 'VARIABLE',
            },
            {
              kind: 'category',
              name: '🟣 Looks',
              colour: SCRATCH.looks,
              contents: [
                { kind: 'block', type: 'text_print' },
                { kind: 'block', type: 'text' },
                { kind: 'block', type: 'text_join' },
                { kind: 'block', type: 'text_length' },
                { kind: 'block', type: 'text_isEmpty' },
                { kind: 'block', type: 'text_indexOf' },
                { kind: 'block', type: 'text_charAt' },
              ],
            },
            {
              kind: 'category',
              name: '🔵 Sensing',
              colour: SCRATCH.sensing,
              contents: [
                { kind: 'block', type: 'math_number' },
                { kind: 'block', type: 'math_random_int' },
                { kind: 'block', type: 'math_constrain' },
                { kind: 'block', type: 'logic_boolean' },
              ],
            },
            {
              kind: 'category',
              name: '🔵 Motion',
              colour: SCRATCH.motion,
              contents: [
                { kind: 'block', type: 'lists_create_empty' },
                { kind: 'block', type: 'lists_create_with' },
                { kind: 'block', type: 'lists_repeat' },
                { kind: 'block', type: 'lists_length' },
                { kind: 'block', type: 'lists_isEmpty' },
                { kind: 'block', type: 'lists_getIndex' },
                { kind: 'block', type: 'lists_setIndex' },
                { kind: 'block', type: 'lists_indexOf' },
              ],
            },
            {
              kind: 'category',
              name: '🩷 My Blocks',
              colour: SCRATCH.myBlocks,
              custom: 'PROCEDURE',
            },
          ],
        };

        // ── Override block colours to match Scratch categories ────────────
        // Control blocks
        ['controls_if', 'controls_ifelse', 'controls_repeat_ext',
         'controls_whileUntil', 'controls_for', 'controls_flow_statements']
          .forEach(t => {
            if (Blockly.Blocks[t] && Blockly.Blocks[t].init) Blockly.Blocks[t].colour_ = SCRATCH.control;
          });

        // Operator blocks
        ['math_arithmetic', 'math_number', 'math_modulo', 'math_round',
         'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean']
          .forEach(t => {
            if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.operators;
          });

        // Looks (text) blocks
        ['text_print', 'text', 'text_join', 'text_length', 'text_isEmpty',
         'text_indexOf', 'text_charAt']
          .forEach(t => {
            if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.looks;
          });

        // Motion (list) blocks
        ['lists_create_empty', 'lists_create_with', 'lists_repeat', 'lists_length',
         'lists_isEmpty', 'lists_getIndex', 'lists_setIndex', 'lists_indexOf']
          .forEach(t => {
            if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.motion;
          });

        // Sensing blocks
        ['math_random_int', 'math_constrain']
          .forEach(t => {
            if (Blockly.Blocks[t]) Blockly.Blocks[t].colour_ = SCRATCH.sensing;
          });

        // ── Scratch-inspired dark theme ───────────────────────────────────
        const scratchTheme = Blockly.Theme.defineTheme('scratchTheme', {
          base: Blockly.Themes.Classic,
          blockStyles: {
            logic_blocks:    { colourPrimary: SCRATCH.control,   colourSecondary: '#CF8B17', colourTertiary: '#CF8B17' },
            loop_blocks:     { colourPrimary: SCRATCH.control,   colourSecondary: '#CF8B17', colourTertiary: '#CF8B17' },
            math_blocks:     { colourPrimary: SCRATCH.operators, colourSecondary: '#389438', colourTertiary: '#389438' },
            text_blocks:     { colourPrimary: SCRATCH.looks,     colourSecondary: '#7D52CC', colourTertiary: '#7D52CC' },
            list_blocks:     { colourPrimary: SCRATCH.motion,    colourSecondary: '#3A7DE0', colourTertiary: '#3A7DE0' },
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

        // ── Inject workspace with Zelos renderer (Scratch look) ───────────
        workspaceRef.current = Blockly.inject(containerRef.current, {
          toolbox,
          theme:    scratchTheme,
          renderer: 'zelos',          // ← Scratch-style rounded blocks
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
          {/* Scratch-style spinning loader */}
          <div className="flex gap-2">
            {['#FFAB19','#59C059','#9966FF','#4C97FF','#FF8C1A'].map((c, i) => (
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
