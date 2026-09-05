import React from 'react';
import HeroSection from '../HeroSection';
import Services from '../Services';
import Products from '../Products';
import About from '../About';
import Transparency from '../Transparency';
import ClosingCta from '../ClosingCta';

function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <Services />
      <Products />
      <About />
      <Transparency />
      <ClosingCta />
    </main>
  );
}

export default Home;
