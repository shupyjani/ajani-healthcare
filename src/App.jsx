import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SkipLink from './components/SkipLink';
import ScrollToTop from './components/ScrollToTop';
import HashScroll from './components/HashScroll';
import Home from './components/pages/Home';
import Contact from './components/pages/Contact';
import NotFound from './components/pages/NotFound';

/*
 * Application shell.
 *
 * The router itself lives in main.jsx so that App can be mounted inside a
 * MemoryRouter in tests. Each route renders its own <main id="main-content">
 * landmark, which is both the skip link's target and the page's single H1
 * container.
 *
 * ScrollToTop and HashScroll split the two navigation cases between them:
 * ScrollToTop returns a plain route change to the top of the page, HashScroll
 * takes a fragment to its section. Exactly one of them acts on any given
 * navigation.
 */
function App() {
  return (
    <>
      <SkipLink />
      <ScrollToTop />
      <HashScroll />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        {/* Compatibility: the previous site published a /sign-up route.
            Enquiries are handled on the contact route now, so those links are
            redirected rather than left to 404. */}
        <Route path="/sign-up" element={<Navigate to="/contact" replace />} />
        <Route path="/signup" element={<Navigate to="/contact" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
