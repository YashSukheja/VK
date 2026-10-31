import type { ReactNode } from 'react'
import { whatsappLink } from '../lib/format'
import type { StoreSettings } from '../lib/types'
import { ChatIcon, ClockIcon, InstagramIcon, PinIcon } from './Icons'
import { VrackMark } from './Logo'

/** Store hours, address, WhatsApp and Instagram, all from Settings, over a giant wordmark. */
/** roomForBar: leaves space for the product page's fixed bottom bar on phones. */
export function SiteFooter({ settings, roomForBar = false }: { settings?: StoreSettings; roomForBar?: boolean }) {
  if (!settings) return null
  const { store_hours: hours, pickup_address: address, whatsapp_number: wa, instagram } = settings
  return (
    <footer className={`mt-10 overflow-hidden bg-ink text-white ${roomForBar ? 'pb-24 md:pb-0' : ''}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pt-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-2.5">
          <VrackMark size={36} halo="#000000" />
          <div className="flex flex-col">
            <span className="font-brand text-sm font-semibold tracking-[0.14em]">VRACK CLOTHING</span>
            <span className="text-[13px] text-[#bdbdb8]">Picked by hand. Book online, pick up in store.</span>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
          {hours && <Row icon={<ClockIcon size={18} />}>{hours}</Row>}
          {address && <Row icon={<PinIcon size={18} />}>{address}</Row>}
          {wa && (
            <Row icon={<ChatIcon size={18} />}>
              <a href={whatsappLink(wa, "Hi Vrack, I'm looking at your store.")} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
                WhatsApp +91 {wa}
              </a>
            </Row>
          )}
          {instagram && (
            <Row icon={<InstagramIcon size={18} />}>
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">
                @{instagram}
              </a>
            </Row>
          )}
        </ul>
      </div>
      <p aria-hidden="true" className="footer-word m-0 mt-6 select-none text-center font-display font-black leading-[0.78]">
        VRACK
      </p>
    </footer>
  )
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-px flex-none text-[#bdbdb8]">{icon}</span>
      <span className="whitespace-pre-line">{children}</span>
    </li>
  )
}
