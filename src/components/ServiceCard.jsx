import React from 'react';
import Reveal from './Reveal';

/*
 * One capability card.
 *
 * The heading sits in its own pale header panel with a number and an icon, so
 * the three cards read as a set at a glance without any of them looking like a
 * priced tier: no price, no "most popular" treatment, no differing emphasis.
 * The body keeps the warm surface the rest of the page uses.
 *
 * `order` is the card's position in the row, which becomes its stagger delay.
 * `index` is the number shown to the reader; it is decorative, because the
 * heading already names the service and a screen reader should not have to
 * hear "one" before it.
 */
function ServiceCard({ title, description, items, note, Icon, index, order = 0 }) {
  return (
    <Reveal as="li" className="service-card" variant="up" order={order}>
      <div className="service-card-header">
        <span className="service-card-mark" aria-hidden="true">
          {Icon ? <Icon /> : null}
          {index ? <span className="service-card-index">{index}</span> : null}
        </span>
        <h3 className="service-card-title">{title}</h3>
      </div>

      <div className="service-card-body">
        <p className="service-card-description">{description}</p>
        {items && items.length > 0 && (
          <ul className="service-card-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {note && <p className="service-card-note">{note}</p>}
      </div>
    </Reveal>
  );
}

export default ServiceCard;
