import CallTable from './CallTable'

export default function LiveCallsView({ calls, currentUser, onCallDeleted, onCallsDeleted, onCallUpdated }) {
  return (
    <CallTable
      calls={calls}
      currentUser={currentUser}
      enableTagging={['admin', 'staff'].includes(currentUser?.role)}
      onCallDeleted={onCallDeleted}
      onCallsDeleted={onCallsDeleted}
      onCallUpdated={onCallUpdated}
    />
  )
}
