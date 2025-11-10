export default function Roadmap() {
  return (
    <div className="card p-6 rounded-lg mb-8">
      <h2 className="text-2xl font-semibold mb-4">Roadmap</h2>
      <div className="space-y-4">
        <div className="roadmap-item current-phase">
          <h3 className="text-lg font-semibold">Phase 1: Launch</h3>
          <p>Deploy token locker with core features (Q3 2025)</p>
        </div>
        <div className="roadmap-item">
          <h3 className="text-lg font-semibold">Phase 2: Enhancements</h3>
          <p>Add batch operations and analytics (Q4 2025)</p>
        </div>
        <div className="roadmap-item">
          <h3 className="text-lg font-semibold">Phase 3: Integration</h3>
          <p>Integrate with more DeFi platforms (Q1 2026)</p>
        </div>
      </div>
    </div>
  );
}
