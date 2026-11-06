-- Canonical storefront schema, indexes and inventory triggers.
create extension if not exists pgcrypto;
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, description text not null default '', position int not null default 0);
create table public.products (
 id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id), name text not null check(length(name) between 2 and 150), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '', price numeric(12,2) not null check(price>0), discount_price numeric(12,2) check(discount_price>0 and discount_price<price), stock int not null default 0 check(stock>=0), sales_count int not null default 0 check(sales_count>=0), available boolean not null default true, published boolean not null default false, featured boolean not null default false, bestseller boolean not null default false, image_url text not null default '', size text not null default '', notes text[] not null default '{}', low_stock_threshold int not null default 3 check(low_stock_threshold>=0), created_at timestamptz not null default now()
);
create index products_catalogue_idx on public.products(category_id,created_at desc) where published;
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, url text not null, alt text not null default '', position int not null default 0);
create table public.combo_items (combo_id uuid references public.products(id) on delete cascade, product_id uuid references public.products(id), quantity int not null check(quantity between 1 and 50), primary key(combo_id,product_id), check(combo_id<>product_id));
create table public.website_settings (id int primary key check(id=1), brand_name text not null default 'MICHAEL''S SCENTSATION', slogan text not null default '...Experience the Art of Fragrance', whatsapp text not null default '', bank_name text not null default '', account_name text not null default '', account_number text not null default '' check(account_number='' or account_number ~ '^\d{10}$'), contact_email text not null default '', instagram text not null default '', address text not null default '', delivery_info text not null default '', delivery_fee numeric(12,2) not null default 0 check(delivery_fee>=0), promo_title text not null default 'Better, together.', promo_text text not null default 'Discover fragrance pairings made for your everyday ritual. Explore our collection of perfume combos.');
insert into public.website_settings(id) values(1);
insert into public.categories(name,slug,description,position) values('Deodorants','deodorants','Everyday freshness, elevated.',1),('Oil Perfumes','oil-perfumes','A little goes a long way.',2),('Luxury Perfumes','luxury-perfumes','Make your presence felt.',3),('Perfume Combos','combos','Some things are better together.',4);
create sequence public.order_reference_seq;
create function public.next_order_reference() returns text language plpgsql set search_path = '' as $$ declare n text:=nextval('public.order_reference_seq')::text; begin return 'MSC-'||to_char(now() at time zone 'Africa/Lagos','YYYYMMDD')||'-'||lpad(n,greatest(6,length(n)),'0'); end $$;
create table public.orders (
 id uuid primary key default gen_random_uuid(), reference text unique not null default public.next_order_reference(), access_hash text unique not null, customer_name text not null, email text not null, phone text not null, address text not null, instructions text not null default '', subtotal numeric(12,2) not null check(subtotal>0), delivery_fee numeric(12,2) not null check(delivery_fee>=0), total numeric(12,2) not null check(total=subtotal+delivery_fee), status text not null default 'Awaiting Payment' check(status in ('Awaiting Payment','Payment Verification Pending','Payment Confirmed','Processing','Ready for Delivery','Delivered','Cancelled')), payment_status text not null default 'awaiting' check(payment_status in ('awaiting','pending','confirmed','rejected')), stock_deducted boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders(created_at desc);
create index orders_payment_idx on public.orders(payment_status,created_at desc);
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,product_id uuid not null references public.products(id),name text not null,unit_price numeric(12,2) not null check(unit_price>0),quantity int not null check(quantity between 1 and 50),image_url text not null default '',unique(order_id,product_id));
create index order_items_order_idx on public.order_items(order_id);
-- Inventory requirements are snapshotted at checkout, including every bundle component.
create table public.order_inventory (order_id uuid references public.orders(id) on delete cascade,product_id uuid references public.products(id),quantity int not null check(quantity>0),primary key(order_id,product_id));
create table public.payments(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),action text not null check(action in ('receipt_submitted','confirmed','rejected')),actor uuid references auth.users(id),note text not null default '',created_at timestamptz not null default now());
create index payments_order_idx on public.payments(order_id);
create table public.payment_receipts(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),path text unique not null,mime_type text not null,size_bytes int not null check(size_bytes between 1 and 3145728),created_at timestamptz not null default now());
create index receipts_order_idx on public.payment_receipts(order_id);
create table public.product_reviews(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),product_id uuid not null references public.products(id),customer_name text not null,rating int not null check(rating between 1 and 5),body text not null check(length(body) between 10 and 1500),approved boolean not null default false,created_at timestamptz not null default now(),unique(order_id,product_id));
create index reviews_product_idx on public.product_reviews(product_id) where approved;
create table public.wishlists(user_id uuid references auth.users(id) on delete cascade,product_id uuid references public.products(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,product_id));
create table public.newsletter_subscribers(email text primary key,unsubscribe_hash text not null,created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),kind text not null,order_id uuid references public.orders(id),payload jsonb not null default '{}',created_at timestamptz not null default now(),sent_at timestamptz,attempts int not null default 0,last_error text,locked_until timestamptz);
create table public.order_history(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),actor uuid references auth.users(id),status text not null,note text not null default '',created_at timestamptz not null default now());
create index order_history_order_idx on public.order_history(order_id);
create table public.rate_limits(key text primary key,count int not null default 1,expires_at timestamptz not null);

do $$ declare t text; begin foreach t in array array['admin_users','categories','products','product_images','combo_items','website_settings','orders','order_items','order_inventory','payments','payment_receipts','product_reviews','wishlists','newsletter_subscribers','notifications','order_history','rate_limits'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); execute format('grant all on public.%I to service_role',t); end loop; end $$;
grant select on public.categories,public.products,public.product_images,public.combo_items,public.website_settings to anon,authenticated;
grant select(id,product_id,customer_name,rating,body,approved,created_at) on public.product_reviews to anon,authenticated;
create policy categories_public on public.categories for select to anon,authenticated using(true);
create policy products_public on public.products for select to anon,authenticated using(published);
create policy images_public on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and (p.published)));
create policy combos_public on public.combo_items for select to anon,authenticated using(exists(select 1 from public.products p where p.id=combo_id and (p.published)));
create policy settings_public on public.website_settings for select to anon,authenticated using(true);
create policy reviews_public on public.product_reviews for select to anon,authenticated using(approved);
grant select,insert,delete on public.wishlists to authenticated;
create policy wishlist_owner_select on public.wishlists for select to authenticated using(user_id=(select auth.uid()));
create policy wishlist_owner_insert on public.wishlists for insert to authenticated with check(user_id=(select auth.uid()));
create policy wishlist_owner_delete on public.wishlists for delete to authenticated using(user_id=(select auth.uid()));

-- All mutations below run with service_role from the Edge Function, never from browsers.
create function public.consume_rate(p_key text,p_limit int,p_seconds int) returns boolean language plpgsql set search_path = '' as $$ declare n int; begin
 delete from public.rate_limits where expires_at<now();
 insert into public.rate_limits(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set count=public.rate_limits.count+1 returning count into n;
 return n<=p_limit;
end $$;

create function public.place_order(p_customer jsonb,p_items jsonb,p_hash text) returns uuid language plpgsql set search_path = '' as $$
declare oid uuid; x record; product_record public.products; amount numeric:=0; delivery numeric; begin
 perform pg_advisory_xact_lock(hashtextextended(p_hash,0));
 select id into oid from public.orders where access_hash=p_hash; if oid is not null then return oid; end if;
 if length(p_hash)<>64 or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid order'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) where quantity not between 1 and 50) then raise exception 'Invalid quantity'; end if;
 if (select count(distinct i."productId") from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int))<>jsonb_array_length(p_items) then raise exception 'Duplicate items'; end if;
 select delivery_fee into delivery from public.website_settings where id=1 and bank_name<>'' and account_name<>'' and account_number ~ '^\d{10}$' and delivery_info<>'';
 if delivery is null then raise exception 'The store is not accepting orders yet'; end if;
 -- Sorted row locks serialize orders and confirmations that touch the same stock.
 perform 1 from public.products where id in (select i."productId" from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) union select c.product_id from public.combo_items c where c.combo_id in(select i."productId" from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int))) order by id for update;
 for x in select * from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) loop
 select * into product_record from public.products where id=x."productId";
 if not found or not product_record.published or not product_record.available or product_record.stock<x.quantity then raise exception 'A fragrance is unavailable or has insufficient stock'; end if;
 amount:=amount+coalesce(product_record.discount_price,product_record.price)*x.quantity;
 end loop;
 insert into public.orders(access_hash,customer_name,email,phone,address,instructions,subtotal,delivery_fee,total) values(p_hash,p_customer->>'name',p_customer->>'email',p_customer->>'phone',p_customer->>'address',coalesce(p_customer->>'instructions',''),amount,delivery,amount+delivery) returning id into oid;
 insert into public.order_items(order_id,product_id,name,unit_price,quantity,image_url) select oid,p.id,p.name,coalesce(p.discount_price,p.price),i.quantity,p.image_url from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) join public.products p on p.id=i."productId";
 insert into public.order_inventory(order_id,product_id,quantity) select oid,req.pid,sum(req.qty) from(select i."productId" pid,i.quantity qty from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) union all select c.product_id,i.quantity*c.quantity from jsonb_to_recordset(p_items) as i("productId" uuid,quantity int) join public.combo_items c on c.combo_id=i."productId") req group by req.pid;
 if exists(select 1 from public.order_inventory r join public.products p on p.id=r.product_id where r.order_id=oid and (p.stock<r.quantity or not p.available or not p.published)) then raise exception 'A fragrance or bundle component is unavailable in this quantity'; end if;
 insert into public.order_history(order_id,status) values(oid,'Awaiting Payment');
 insert into public.notifications(kind,order_id) values('new_order',oid);
 return oid;
end $$;

create function public.submit_receipt(p_order uuid,p_path text,p_type text,p_size int) returns void language plpgsql set search_path = '' as $$ declare o public.orders; begin
 select * into o from public.orders where id=p_order for update;
 if o.id is null or o.payment_status='confirmed' or o.status='Cancelled' then raise exception 'This order cannot accept receipts'; end if;
 insert into public.payment_receipts(order_id,path,mime_type,size_bytes) values(p_order,p_path,p_type,p_size);
 update public.orders set payment_status='pending',status='Payment Verification Pending',updated_at=now() where id=p_order;
 insert into public.payments(order_id,action) values(p_order,'receipt_submitted');
 insert into public.order_history(order_id,status) values(p_order,'Payment Verification Pending');
 insert into public.notifications(kind,order_id) values('receipt_uploaded',p_order);
end $$;

create function public.manage_order(p_order uuid,p_action text,p_actor uuid,p_note text default '') returns void language plpgsql set search_path = '' as $$ declare o public.orders; x record; next_status text; begin
 if not exists(select 1 from public.admin_users where user_id=p_actor) then raise exception 'Administrator access required'; end if;
 select * into o from public.orders where id=p_order for update; if o.id is null then raise exception 'Order not found'; end if;
 if p_action='confirm' then
 if o.payment_status='confirmed' then return; end if;
 if o.status='Cancelled' or o.payment_status<>'pending' then raise exception 'Only a pending payment can be confirmed'; end if;
 perform 1 from public.products where id in(select product_id from public.order_inventory where order_id=p_order) order by id for update;
 if exists(select 1 from public.order_inventory r join public.products p on r.product_id=p.id where r.order_id=p_order and (p.stock<r.quantity or not p.available)) then raise exception 'Insufficient stock. Resolve inventory before confirming payment'; end if;
 update public.products p set stock=p.stock-r.quantity from public.order_inventory r where r.order_id=p_order and r.product_id=p.id;
 update public.products pr set sales_count=pr.sales_count+i.quantity from public.order_items i where i.order_id=p_order and i.product_id=pr.id;
 update public.orders set payment_status='confirmed',status='Payment Confirmed',stock_deducted=true,updated_at=now() where id=p_order;
 insert into public.payments(order_id,action,actor,note) values(p_order,'confirmed',p_actor,p_note);
 insert into public.notifications(kind,order_id) values('payment_confirmed',p_order);
 next_status:='Payment Confirmed';
 elsif p_action='reject' then
 if o.payment_status<>'pending' or o.status='Cancelled' then raise exception 'Only pending payments can be rejected'; end if;
 update public.orders set payment_status='rejected',status='Awaiting Payment',updated_at=now() where id=p_order;
 insert into public.payments(order_id,action,actor,note) values(p_order,'rejected',p_actor,p_note); next_status:='Awaiting Payment';
 elsif p_action='Cancelled' then
 if o.status in('Cancelled','Delivered') or o.payment_status='confirmed' then raise exception 'Paid or delivered orders require an explicit refund process; contact the customer before making a stock adjustment'; end if;
 update public.orders set status='Cancelled',updated_at=now() where id=p_order; next_status:='Cancelled';
 else
 if o.payment_status<>'confirmed' or not ((o.status='Payment Confirmed' and p_action='Processing') or (o.status='Processing' and p_action='Ready for Delivery') or (o.status='Ready for Delivery' and p_action='Delivered')) then raise exception 'Invalid order status transition'; end if;
 update public.orders set status=p_action,updated_at=now() where id=p_order; next_status:=p_action;
 end if;
 insert into public.order_history(order_id,actor,status,note) values(p_order,p_actor,next_status,p_note);
end $$;

create function public.submit_review(p_order uuid,p_product uuid,p_rating int,p_body text) returns void language plpgsql set search_path = '' as $$ declare n text; begin
 select split_part(customer_name,' ',1) into n from public.orders where id=p_order and payment_status='confirmed' and status<>'Cancelled';
 if n is null or not exists(select 1 from public.order_items where order_id=p_order and product_id=p_product) then raise exception 'Only a confirmed purchase can review this fragrance'; end if;
 insert into public.product_reviews(order_id,product_id,customer_name,rating,body) values(p_order,p_product,n,p_rating,p_body);
 insert into public.notifications(kind,order_id) values('new_review',p_order);
end $$;

create function public.save_product(p_data jsonb,p_components jsonb) returns uuid language plpgsql set search_path = '' as $$ declare pid uuid:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid()); begin
 perform pg_advisory_xact_lock(hashtextextended('product-bundles',0));
 if jsonb_array_length(p_components)>0 and not exists(select 1 from public.categories where id=(p_data->>'category_id')::uuid and slug='combos') then raise exception 'Bundle components require the combos category'; end if;
 if exists(select 1 from jsonb_to_recordset(p_components) as c(product_id uuid,quantity int) where c.product_id=pid or c.quantity not between 1 and 50) then raise exception 'Invalid bundle'; end if;
 if exists(select 1 from jsonb_to_recordset(p_components) as c(product_id uuid,quantity int) join public.combo_items b on b.combo_id=c.product_id) or (jsonb_array_length(p_components)>0 and exists(select 1 from public.combo_items where product_id=pid)) then raise exception 'Nested bundles are not supported'; end if;
 insert into public.products(id,category_id,name,slug,description,price,discount_price,stock,available,published,featured,bestseller,image_url,size,notes,low_stock_threshold) values(pid,(p_data->>'category_id')::uuid,p_data->>'name',p_data->>'slug',p_data->>'description',(p_data->>'price')::numeric,(p_data->>'discount_price')::numeric,(p_data->>'stock')::int,(p_data->>'available')::boolean,(p_data->>'published')::boolean,(p_data->>'featured')::boolean,(p_data->>'bestseller')::boolean,p_data->>'image_url',p_data->>'size',array(select jsonb_array_elements_text(p_data->'notes')),(p_data->>'low_stock_threshold')::int) on conflict(id) do update set category_id=excluded.category_id,name=excluded.name,slug=excluded.slug,description=excluded.description,price=excluded.price,discount_price=excluded.discount_price,stock=excluded.stock,available=excluded.available,published=excluded.published,featured=excluded.featured,bestseller=excluded.bestseller,image_url=excluded.image_url,size=excluded.size,notes=excluded.notes,low_stock_threshold=excluded.low_stock_threshold;
 delete from public.combo_items where combo_id=pid;
 insert into public.combo_items(combo_id,product_id,quantity) select pid,product_id,quantity from jsonb_to_recordset(p_components) as c(product_id uuid,quantity int);
 return pid;
end $$;

create function public.claim_notifications() returns setof public.notifications language sql set search_path = '' as $$ update public.notifications set locked_until=now()+interval '5 minutes',attempts=attempts+1 where id in(select id from public.notifications where sent_at is null and attempts<10 and (locked_until is null or locked_until<now()) order by created_at for update skip locked limit 20) returning *; $$;
create function public.admin_stats() returns jsonb language sql set search_path = '' as $$ select jsonb_build_object('total_products',(select count(*) from public.products),'available_products',(select count(*) from public.products where available and stock>0),'sold_out_products',(select count(*) from public.products where not available or stock=0),'total_orders',(select count(*) from public.orders),'pending_orders',(select count(*) from public.orders where status not in('Delivered','Cancelled')),'pending_verifications',(select count(*) from public.orders where payment_status='pending'),'confirmed_payments',(select count(*) from public.orders where payment_status='confirmed'),'total_sales',(select coalesce(sum(total),0) from public.orders where payment_status='confirmed')); $$;
do $$ declare f record; begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in('consume_rate','place_order','submit_receipt','manage_order','submit_review','save_product','claim_notifications','admin_stats','next_order_reference') loop execute format('revoke all on function %s from public, anon, authenticated',f.signature); execute format('grant execute on function %s to service_role',f.signature); end loop; end $$;
grant usage,select on sequence public.order_reference_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,3145728,array['image/jpeg','image/png','image/webp']),('payment-receipts','payment-receipts',false,3145728,array['image/jpeg','image/png','application/pdf']);
-- No browser may write objects. Edge Function checks MIME signature, authorization and size.
create policy product_image_read on storage.objects for select to anon,authenticated using(bucket_id='product-images');

create index combo_component_idx on public.combo_items(product_id);
create index notifications_order_idx on public.notifications(order_id);
create index notifications_pending_idx on public.notifications(created_at) where sent_at is null;
create index history_actor_idx on public.order_history(actor);
create index inventory_product_idx on public.order_inventory(product_id);
create index order_item_product_idx on public.order_items(product_id);
create index payment_actor_idx on public.payments(actor);
create index product_images_product_idx on public.product_images(product_id);
create index wishlist_product_idx on public.wishlists(product_id);
create index product_category_idx on public.products(category_id);
create index reviews_order_idx on public.product_reviews(order_id);
create index reviews_product_all_idx on public.product_reviews(product_id);

create function public.notify_low_stock() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.published and new.stock<=new.low_stock_threshold then
  if TG_OP='INSERT' or old.stock>new.low_stock_threshold or not old.published or (old.low_stock_threshold<new.stock and new.low_stock_threshold>=new.stock) then
   insert into public.notifications(kind,payload) values('low_stock',jsonb_build_object('product_id',new.id,'name',new.name,'stock',new.stock));
  end if;
 end if;
 return new;
end $$;
revoke all on function public.notify_low_stock() from public,anon,authenticated;
create trigger products_low_stock after insert or update of stock,low_stock_threshold,published on public.products for each row execute function public.notify_low_stock();
