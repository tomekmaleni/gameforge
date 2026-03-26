import React from 'react';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-slate-400 mb-6">Page not found</p>
        <Link to="/" className="text-amber-400 hover:text-amber-300">Go home</Link>
      </div>
    </div>
  );
}
