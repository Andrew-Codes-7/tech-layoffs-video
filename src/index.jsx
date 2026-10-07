import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Layoffs } from './Layoffs';

const Root = () => (
  <Composition id="Layoffs" component={Layoffs} durationInFrames={900} fps={30} width={1920} height={1080} />
);

registerRoot(Root);
