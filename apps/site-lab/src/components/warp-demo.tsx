import * as React from 'react';
import { WarpCarousel } from '@/components/ui/warp-carousel';
import { CAMPAIGN_CARDS } from './campaign-cards';

export default function WarpDemo() {
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(mq.matches); if (mq.matches) setPlaying(false); };
    update(); mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return <>
    <div className="stage">
      <WarpCarousel className="warp-stage" cards={CAMPAIGN_CARDS} step={1} warp={0.7} background="#efefef" index={index} onIndexChange={setIndex} autoplay={playing && !reduced} ariaLabel="Experimento Warp Carousel, artes do hero público" />
    </div>
    <div className="controls" aria-label="Controles do experimento">
      <button type="button" onClick={() => setIndex((index + 3) % 4)}>Anterior</button>
      <button type="button" aria-pressed={!playing} onClick={() => setPlaying(!playing)} disabled={reduced}>{playing ? 'Pausar' : 'Reproduzir'}</button>
      <button type="button" onClick={() => setIndex((index + 1) % 4)}>Próximo</button>
      <span role="status">Cartão {index + 1} de {CAMPAIGN_CARDS.length}</span>
    </div>
    {reduced && <p className="note">Movimento reduzido: avanço automático e animações desativados.</p>}
  </>;
}
