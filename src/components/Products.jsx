import React from 'react';
import FeaturedProduct from './FeaturedProduct';
import PlannedProduct from './PlannedProduct';
import Reveal from './Reveal';
import './Products.css';

function Products() {
  return (
    <section className="section products" id="products" aria-labelledby="products-heading">
      <div className="container">
        <Reveal as="p" className="eyebrow" variant="label">
          Products
        </Reveal>
        <Reveal as="h2" id="products-heading" className="section-heading" variant="headline" order={1}>
          Genuine product work, built alongside our services
        </Reveal>
        <Reveal as="p" className="section-intro" variant="up" order={2}>
          Alongside consultancy and staffing, Ajani Healthcare builds its own healthcare
          technology. Here is where that work stands today.
        </Reveal>

        <FeaturedProduct />
        <PlannedProduct />
      </div>
    </section>
  );
}

export default Products;
