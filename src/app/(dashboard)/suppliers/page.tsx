'use client';
export default function Page() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-800 capitalize">
          {(() => {
            const names: Record<string,string> = {
              inventory:'🏪 Kho hàng', purchases:'🛒 Mua hàng', customers:'👥 Khách hàng',
              suppliers:'🤝 Nhà cung cấp', finance:'💰 Công nợ', reports:'📈 Báo cáo', settings:'⚙️ Cài đặt'
            };
            return names['suppliers'] || 'suppliers';
          })()}
        </h1>
      </div>
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Đang phát triển</h2>
        <p className="text-gray-500 text-sm">Tính năng này sẽ sớm được hoàn thiện</p>
      </div>
    </div>
  );
}
