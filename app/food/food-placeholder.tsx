import type { CSSProperties, ReactNode } from 'react';
import { getFoodVisual } from '../../lib/food-visuals.mjs';

type FoodPlaceholderProps = {
  category: string;
  name: string;
  index: number;
};

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function steam(x: number): ReactNode {
  return <path {...line} d={`M${x} 51c-8-8 9-14 1-25`} />;
}

function FoodMotif({ kind }: { kind: string }) {
  switch (kind) {
    case 'sweet':
      return <>
        <path className="motif-accent" d="M105 89h110l-10 45c-4 17-18 27-35 27h-20c-17 0-31-10-35-27z" />
        <path {...line} d="M101 89h118M128 164h64M199 77c16-21 28-21 38-9M217 72l-18 62" />
        <circle className="motif-cream" cx="137" cy="71" r="20" />
        <circle className="motif-cream" cx="170" cy="62" r="25" />
        <circle className="motif-cream" cx="199" cy="73" r="18" />
      </>;
    case 'raw':
      return <>
        <ellipse className="motif-shadow" cx="160" cy="145" rx="86" ry="18" />
        <path className="motif-cream" d="M160 39c-55 0-85 37-76 85 23 25 129 25 152 0 9-48-21-85-76-85z" />
        <path {...line} d="M160 43v91M127 49l20 87M193 49l-20 87M101 68l34 72M219 68l-34 72M87 99l44 44M233 99l-44 44" />
        <circle className="motif-accent" cx="160" cy="105" r="19" />
      </>;
    case 'rice-roll':
      return <>
        <ellipse className="motif-shadow" cx="156" cy="147" rx="96" ry="18" />
        <rect className="motif-cream" x="75" y="79" width="121" height="31" rx="15" transform="rotate(-8 75 79)" />
        <rect className="motif-cream" x="92" y="105" width="125" height="31" rx="15" transform="rotate(5 92 105)" />
        <rect className="motif-accent" x="118" y="58" width="112" height="28" rx="14" transform="rotate(11 118 58)" />
        <path {...line} d="M219 41L97 150M238 52L116 161" />
      </>;
    case 'hotpot':
      return <>
        {steam(128)}{steam(160)}{steam(192)}
        <path className="motif-accent" d="M88 85h144l-12 59c-3 14-15 24-30 24h-60c-15 0-27-10-30-24z" />
        <path {...line} d="M81 85h158M103 108H68M217 108h35M126 168h68" />
        <path className="motif-cream" d="M125 109c18-17 34-13 47 0-18 17-34 13-47 0zm43 20c18-17 34-13 47 0-18 17-34 13-47 0z" />
      </>;
    case 'noodles':
      return <>
        <path className="motif-accent" d="M86 91h148c-8 49-31 75-74 75S94 140 86 91z" />
        <path {...line} d="M78 91h164M118 166h84M218 38L110 142M239 47L131 151" />
        <path {...line} d="M121 85c8-26 16 26 24 0s16 26 24 0 16 26 24 0" />
      </>;
    case 'congee':
      return <>
        {steam(143)}{steam(176)}
        <path className="motif-cream" d="M91 82h138l-7 67c-2 14-14 24-28 24h-68c-14 0-26-10-28-24z" />
        <path {...line} d="M83 82h154M113 173h94M209 66c19-21 35-17 43-3M226 66l-31 72" />
        <circle className="motif-accent" cx="161" cy="118" r="22" />
      </>;
    case 'wok':
      return <>
        <path className="motif-cream" d="M75 83h139c-5 50-31 78-69 78S80 133 75 83z" />
        <path {...line} d="M66 83h160M210 92l54-26M118 162l-10 17M169 162l10 17" />
        <path className="motif-accent" d="M122 129c-3-17 13-24 12-42 15 11 13 23 20 29 9-12 8-22 7-31 24 18 26 48 4 62-19 12-39 2-43-18z" />
      </>;
    case 'private':
      return <>
        <ellipse className="motif-shadow" cx="160" cy="151" rx="91" ry="14" />
        <path className="motif-accent" d="M82 132c6-46 33-73 78-73s72 27 78 73z" />
        <path {...line} d="M70 132h180M160 57V43M147 43h26" />
        <path className="motif-cream" d="M189 86c23-23 43-20 52-11-10 18-29 24-50 18-9 18-20 29-37 40 10-17 21-31 35-47z" />
      </>;
    case 'global':
      return <>
        <circle className="motif-cream" cx="160" cy="105" r="59" />
        <circle {...line} cx="160" cy="105" r="43" />
        <path {...line} d="M82 54v104M68 54v41c0 15 28 15 28 0V54M238 54v104M238 54c28 13 28 56 0 63" />
        <path className="motif-accent" d="M160 75l8 18 20 2-15 14 4 20-17-10-17 10 4-20-15-14 20-2z" />
      </>;
    case 'dimsum':
      return <>
        {steam(132)}{steam(163)}{steam(194)}
        <path className="motif-accent" d="M84 92h152v56c0 16-13 29-29 29h-94c-16 0-29-13-29-29z" />
        <path {...line} d="M74 92h172M84 122h152M106 177h108" />
        <path className="motif-cream" d="M111 91c-3-24 18-39 39-23 11-23 45-20 52 4 20-4 29 7 25 19z" />
      </>;
    case 'roast':
      return <>
        <path {...line} d="M106 32h108M135 32v31M185 32v31M135 58c-29 28-42 72-16 101M185 58c29 28 42 72 16 101" />
        <path className="motif-accent" d="M132 59c-35 23-45 83-10 105 25 16 50-4 44-31-5-23-20-34-7-65z" />
        <path className="motif-cream" d="M188 59c35 23 45 83 10 105-25 16-50-4-44-31 5-23 20-34 7-65z" />
        <circle className="motif-cut" cx="132" cy="125" r="9" />
        <circle className="motif-cut" cx="188" cy="125" r="9" />
      </>;
    case 'archive':
      return <>
        <rect className="motif-cream" x="85" y="38" width="150" height="132" rx="4" />
        <path {...line} d="M108 65h104M108 89h76M108 113h94M108 137h58" />
        <path className="motif-accent" d="M194 117h46v46h-46z" />
        <path className="motif-cut" d="M203 151l10-12 8 7 9-13 5 18z" />
      </>;
    default:
      return <>
        <path className="motif-accent" d="M72 67h176l-15 38H87z" />
        <path className="motif-cream" d="M89 105h142v66H89z" />
        <path {...line} d="M72 67h176M102 105v66M218 105v66M126 127h68M126 149h52" />
      </>;
  }
}

export function FoodPlaceholder({ category, name, index }: FoodPlaceholderProps) {
  const visual = getFoodVisual(category, index);
  const offsets = [[0, 0], [-5, 1], [6, -2], [0, 4]][visual.variant];
  const style = {
    '--food-placeholder-tone': visual.tone,
    '--food-placeholder-angle': `${[-2, 1, -1, 2][visual.variant]}deg`,
    '--food-placeholder-x': `${offsets[0]}px`,
    '--food-placeholder-y': `${offsets[1]}px`,
  } as CSSProperties;

  return (
    <div className={`food-placeholder food-placeholder-${visual.kind}`} style={style} data-visual-kind={visual.kind}>
      <svg className="food-placeholder-svg" viewBox="0 0 320 190" role="img" aria-label={`${name}的本地风格化餐符`}>
        <path className="motif-orbit" d="M-19 156C44 63 126 40 236 35c58-3 93 6 122 28" />
        <path className="motif-orbit motif-orbit-small" d="M19 174c66-69 151-83 280-53" />
        <g className={`motif-group motif-variant-${visual.variant}`}>
          <FoodMotif kind={visual.kind} />
        </g>
        <circle className="motif-dot" cx="269" cy="39" r="5" />
        <path className="motif-spark" d="M51 51l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" />
      </svg>
      <span className="food-placeholder-caption" aria-hidden="true">{category}</span>
    </div>
  );
}
