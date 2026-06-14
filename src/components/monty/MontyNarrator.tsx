import { useMontyStore } from '../../store/montyStore';
import MontyAvatar from './MontyAvatar';
import MontyBubble from './MontyBubble';

export default function MontyNarrator() {
  const { cockpitState, narratorLine, setNarratorLine } = useMontyStore();

  return (
    <div className="flex items-end gap-3">
      <MontyAvatar state={cockpitState} size={120} />
      <MontyBubble
        text={narratorLine}
        onComplete={() => setNarratorLine(null)}
        duration={5000}
        wide
      />
    </div>
  );
}
