// app/components/cart-drawers/Drawer.jsx

export default function Drawer({ id, children }) {
  console.warn(`[Drawer] Rendering drawer "${id}" always for debug`);
  return (
    <div
      id={id}
      className="fixed inset-0 z-50 bg-yellow-500 bg-opacity-80 flex justify-end"
    >
      <div className="w-full max-w-md h-full bg-white shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Drawer: {id}</h2>
        {children}
      </div>
    </div>
  );
}
