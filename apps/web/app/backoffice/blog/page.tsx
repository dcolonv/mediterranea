import { BackofficeBlog } from './backoffice-blog';

export const metadata = { title: 'Blog | Mediterranea Backoffice' };

export default function BlogAdminPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px w-8 bg-gold" />
          <span className="text-xs tracking-[0.3em] text-gold uppercase">Content</span>
        </div>
        <h1 className="font-serif text-3xl text-white">Blog</h1>
        <p className="mt-2 text-white-50">Write skincare tips and studio news. Published posts appear on the public blog.</p>
      </div>
      <BackofficeBlog />
    </div>
  );
}
