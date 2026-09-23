// The signed-in user's cart (stored in Supabase). Guests are sent to sign in.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { qk } from "@/lib/query-keys";
import { readableError } from "@/lib/supabase";
import * as cartService from "@/services/cartService";

export function useCart() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  const key = qk.cart(userId);

  const query = useQuery({
    queryKey: key,
    queryFn: cartService.getCart,
    enabled: Boolean(userId),
  });

  const lines = query.data ?? [];
  const totals = cartService.cartTotals(lines);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const onError = (err: unknown) => {
    toast.error(readableError(err, "Couldn't update your cart."));
    refresh();
  };

  const addMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.addToCart(productId, quantity),
    onSuccess: refresh,
    onError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      quantity <= 0
        ? cartService.removeCartItem(itemId)
        : cartService.updateCartItem(itemId, quantity),
    // Update the screen straight away, then confirm with the database.
    onMutate: ({ itemId, quantity }) => {
      queryClient.setQueryData<cartService.CartLine[]>(key, (old) =>
        (old ?? [])
          .map((l) => (l.id === itemId ? { ...l, quantity } : l))
          .filter((l) => l.quantity > 0),
      );
    },
    onSettled: refresh,
    onError,
  });

  const clearMutation = useMutation({
    mutationFn: () => cartService.clearCart(lines.map((l) => l.id)),
    onSuccess: refresh,
    onError,
  });

  // Returns true when the item was added.
  const add = async (productId: string, quantity = 1, productName?: string) => {
    if (!userId) {
      toast.info("Sign in to add items to your cart.");
      navigate({ to: "/login", search: { redirect: href } });
      return false;
    }
    try {
      await addMutation.mutateAsync({ productId, quantity });
      toast.success(productName ? `${productName} added to cart` : "Added to cart");
      return true;
    } catch {
      return false;
    }
  };

  return {
    lines,
    totals,
    isSignedIn: Boolean(userId),
    isLoading: authLoading || (Boolean(userId) && query.isLoading),
    error: query.error,
    refetch: query.refetch,
    add,
    isAdding: addMutation.isPending,
    setQuantity: (itemId: string, quantity: number) => updateMutation.mutate({ itemId, quantity }),
    remove: (itemId: string) => updateMutation.mutate({ itemId, quantity: 0 }),
    clear: () => clearMutation.mutate(),
    refresh,
  };
}
