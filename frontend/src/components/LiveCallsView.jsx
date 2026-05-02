import CallTable from './CallTable'

export default function LiveCallsView({ calls, currentUser, canDownloadRecordings, onCallDeleted, onCallsDeleted, onCallUpdated, onRecordingUploaded }) {
  return (
    <CallTable
      calls={calls}
      currentUser={currentUser}
      canDownloadRecordings={canDownloadRecordings}
      enableTagging={['admin', 'staff'].includes(currentUser?.role)}
      onCallDeleted={onCallDeleted}
      onCallsDeleted={onCallsDeleted}
      onCallUpdated={onCallUpdated}
      onRecordingUploaded={onRecordingUploaded}
    />
  )
}
