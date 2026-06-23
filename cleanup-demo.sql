-- ============================================================
-- Sri Siri — FULL BLANK SLATE
-- Removes ALL demo/seed data. Run once in the Supabase SQL editor.
--
-- KEEPS: delivery_settings, outlets (HQ), and your accounts
--        (auth.users / profiles — including your super_admin).
-- DELETES: orders, order_items, products, product_variants,
--          categories, coupons, expenses, workers.
-- ============================================================

-- transactions
delete from order_items;
delete from orders;

-- catalog
delete from product_variants;
delete from products;
delete from coupons;
delete from categories;          -- delete products first (FK products.cat -> categories.id)

-- operations
delete from expenses;
delete from workers;

-- restart order numbering for a clean first order
alter sequence order_no_seq restart with 1001;

-- ------------------------------------------------------------
-- After running this:
--  • Customer storefront will be empty ("No items found").
--  • In the Owner cockpit: open Products → "Manage categories" and
--    add at least one category FIRST, then add products (a product
--    must reference an existing category).
-- ------------------------------------------------------------
