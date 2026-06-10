export default function ProfilePage() {
  return <div><h1 className="text-3xl font-bold mb-8">My Profile</h1><div className="bg-white rounded-lg shadow p-6"><form className="space-y-4"><div><label className="block text-sm font-medium mb-2">Name</label><input type="text" className="w-full border rounded px-3 py-2" /></div><button className="bg-blue-600 text-white px-4 py-2 rounded">Save</button></form></div></div>;
}
