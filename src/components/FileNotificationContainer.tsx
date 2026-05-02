import { useSync } from "@/contexts/sync-context";
import { FileNotification } from "./FileNotification";
import { FileReceivingProgress } from "./FileReceivingProgress";

export function FileNotificationContainer() {
  const {
    incomingOffers,
    acceptFile,
    rejectFile,
    incomingTransfers,
    cancelReceive,
  } = useSync();

  const receivingEntries = Array.from(incomingTransfers.entries());

  if (incomingOffers.length === 0 && receivingEntries.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      {incomingOffers.map((offer) => (
        <FileNotification
          key={offer.transferId}
          offer={offer}
          onAccept={() => acceptFile(offer.transferId)}
          onReject={() => rejectFile(offer.transferId)}
        />
      ))}
      {receivingEntries.map(([transferId, transfer]) => (
        <FileReceivingProgress
          key={transferId}
          fileName={transfer.meta.fileName}
          fileSize={transfer.meta.fileSize}
          sent={transfer.progress.sent}
          total={transfer.progress.total}
          onCancel={() => cancelReceive(transferId)}
        />
      ))}
    </div>
  );
}
