import Header from './Header';
import Footer from './Footer';
import RouteBoundary from './RouteBoundary';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-surface text-on-surface flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1 pt-24" tabIndex={-1}>
        <RouteBoundary variant="content">{children}</RouteBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
