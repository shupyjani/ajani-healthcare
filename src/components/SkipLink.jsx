import React from 'react';

/*
 * Skip link.
 *
 * The href keeps it working with JavaScript disabled, but the click is handled
 * here as well: following a fragment alone moves the scroll position without
 * reliably moving focus, which leaves a keyboard user's next Tab back at the
 * top of the header. Focusing the target explicitly — it carries tabIndex={-1}
 * — is what actually makes the link do its job.
 */
function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }) {
  const onClick = (event) => {
    const target = document.getElementById(targetId);
    if (!target) return;

    event.preventDefault();
    target.focus();

    if (typeof target.scrollIntoView === 'function') {
      target.scrollIntoView();
    }
  };

  return (
    <a className="skip-link" href={`#${targetId}`} onClick={onClick}>
      {children}
    </a>
  );
}

export default SkipLink;
