export default function Templates() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Templates</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'GCE Study Guide', desc: 'Structured study guide template', icon: '📚' },
          { name: 'Mock Examination', desc: 'Exam paper with marking scheme', icon: '✍️' },
          { name: 'Research Proposal', desc: 'Academic research proposal format', icon: '📝' },
          { name: 'Thesis Template', desc: 'Standard thesis structure', icon: '🎓' },
          { name: 'Question Bank', desc: 'Reusable question repository', icon: '❓' },
          { name: 'Textbook Chapter', desc: 'Chapter-based textbook format', icon: '📖' },
        ].map((template) => (
          <div key={template.name} className="card">
            <div className="flex items-start justify-between">
              <span className="text-3xl">{template.icon}</span>
              <span className="badge badge-info">New</span>
            </div>
            <h3 className="mt-3 font-medium text-surface-900">{template.name}</h3>
            <p className="text-sm text-surface-500 mt-1">{template.desc}</p>
            <button className="mt-4 w-full btn-secondary text-sm">Use Template</button>
          </div>
        ))}
      </div>
    </div>
  );
}
