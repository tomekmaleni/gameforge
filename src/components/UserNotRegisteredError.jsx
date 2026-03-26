import React from 'react';

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Account Not Found</h1>
        <p className="text-slate-400">Please register to continue.</p>
      </div>
    </div>
  );
}
