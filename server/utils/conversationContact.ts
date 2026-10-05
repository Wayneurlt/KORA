interface ConversationWithContact {
  contactName: string | null
  contactPhone: string | null
  parent: { id: string, firstName: string, lastName: string, whatsappNumber: string } | null
}

/**
 * Who a conversation is with: the linked parent, or — for a chat staff haven't
 * linked yet — the WhatsApp sender as SendPulse described them.
 */
export function conversationContact(conversation: ConversationWithContact) {
  const { parent } = conversation
  if (parent) {
    return { id: parent.id, linked: true, name: `${parent.firstName} ${parent.lastName}`, whatsappNumber: parent.whatsappNumber as string | null }
  }
  return {
    id: null,
    linked: false,
    name: conversation.contactName || (conversation.contactPhone ? `+${conversation.contactPhone}` : 'Unknown WhatsApp user'),
    whatsappNumber: conversation.contactPhone
  }
}
