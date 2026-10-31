// Checks the wishlist and reviews rules. Run: npm run test:db
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { client, makeUser, psql, service } from './helpers.mjs'

const stamp = Date.now()
const tail = String(stamp).slice(-6)
const PASSWORD = 'test-password-123'
let n = 0

async function customer() {
  n += 1
  const c = client()
  const { data, error } = await c.auth.signUp({
    email: `w-${crypto.randomUUID()}@customers.vks-store.invalid`,
    password: PASSWORD,
    options: { data: { username: `wr${n}_${tail}`, mobile: `8${n}${tail}11`.slice(0, 10) } },
  })
  assert.ifError(error)
  return { c, id: data.user.id }
}

async function product() {
  const svc = service()
  const { data: cat } = await svc.from('categories').select('id').eq('slug', 'shirts').single()
  const { data: p } = await svc.from('products').insert({ category_id: cat.id, name: `Shirt ${stamp} ${n}`, price: 500 }).select().single()
  await svc.from('product_sizes').insert({ product_id: p.id, size: 'M', stock: 3 })
  return p
}

async function bookAndCollect(c, p) {
  const { data, error } = await c.rpc('place_booking', {
    p_items: [{ product_id: p.id, size: 'M', quantity: 1 }],
    p_fulfilment: 'pickup',
    p_delivery_address: null,
    p_payment_method: 'cash',
    p_note: '',
  })
  assert.ifError(error)
  return data[0].id
}

const review = (c, p, rating, comment = '') => c.rpc('submit_review', { p_product_id: p.id, p_rating: rating, p_comment: comment })

test('hearts are private to each customer', async () => {
  const a = await customer()
  const b = await customer()
  const p = await product()
  assert.ifError((await a.c.from('wishlist').insert({ product_id: p.id })).error)
  // Twice is refused (one heart each).
  assert.ok((await a.c.from('wishlist').insert({ product_id: p.id })).error)
  // Nobody can heart for someone else.
  assert.ok((await b.c.from('wishlist').insert({ customer_id: a.id, product_id: p.id })).error)
  assert.equal((await a.c.from('wishlist').select('product_id')).data.length, 1)
  assert.equal((await b.c.from('wishlist').select('product_id')).data.length, 0)
  assert.equal((await client().from('wishlist').select('product_id')).data?.length ?? 0, 0)
  await b.c.from('wishlist').delete().eq('product_id', p.id)
  assert.equal((await a.c.from('wishlist').select('product_id')).data.length, 1)
  assert.ifError((await a.c.from('wishlist').delete().eq('product_id', p.id)).error)
  assert.equal((await a.c.from('wishlist').select('product_id')).data.length, 0)
})

test('only customers who collected a piece can review it, once', async () => {
  const a = await customer()
  const p = await product()
  assert.match((await review(client(), p, 5)).error.message, /permission|Log in/)
  assert.match((await review(a.c, p, 5)).error.message, /collected/)

  const booking = await bookAndCollect(a.c, p)
  // Booked but not yet collected.
  assert.match((await review(a.c, p, 5)).error.message, /collected/)
  await service().from('bookings').update({ status: 'completed' }).eq('id', booking)

  assert.match((await review(a.c, p, 6)).error.message, /1 to 5/)
  assert.ifError((await review(a.c, p, 4, 'Good fit')).error)
  // Writing again changes the same review.
  assert.ifError((await review(a.c, p, 5, 'Great fit')).error)
  const { data: shown, error } = await client().from('reviews').select('customer_name, rating, comment').eq('product_id', p.id)
  assert.ifError(error)
  assert.deepEqual(shown, [{ customer_name: `wr${n}_${tail}`, rating: 5, comment: 'Great fit' }])
  // Shoppers can't see which account wrote it.
  assert.ok((await client().from('reviews').select('customer_id').eq('product_id', p.id)).error)
  // Customers can't edit someone's review or reply themselves.
  await a.c.from('reviews').update({ reply: 'Thanks me' }).eq('product_id', p.id)
  assert.equal((await client().from('reviews').select('reply').eq('product_id', p.id)).data[0].reply, null)
})

test('the admin replies and hides; low stars ping the phone', async () => {
  const email = `rev${stamp}@example.com`
  await makeUser(email, PASSWORD, { admin: true })
  const a = await customer()
  const p = await product()
  const booking = await bookAndCollect(a.c, p)
  await service().from('bookings').update({ status: 'completed' }).eq('id', booking)

  psql("update public.admin_settings set ntfy_topic = 'vrack_test_topic_1234567890' where id = 1;")
  const sent = () => Number(psql('select (select count(*) from net.http_request_queue) + (select count(*) from net._http_response);'))
  const before = sent()
  assert.ifError((await review(a.c, p, 2, 'Button missing')).error)
  assert.equal(sent(), before + 1)
  psql('update public.admin_settings set ntfy_topic = null where id = 1;')

  const svc = service()
  const { data: r } = await svc.from('reviews').select('id').eq('product_id', p.id).single()
  await svc.from('reviews').update({ reply: 'Sorry, come in and we will fix it.', is_hidden: true }).eq('id', r.id)
  assert.equal((await client().from('reviews').select('id').eq('product_id', p.id)).data.length, 0)
  // The author still sees their own hidden review.
  assert.equal((await a.c.from('reviews').select('reply').eq('product_id', p.id)).data[0].reply, 'Sorry, come in and we will fix it.')
})
