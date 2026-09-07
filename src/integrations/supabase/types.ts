export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          author_id: string | null
          category_tag: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_tag?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_tag?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_penalties: {
        Row: {
          auction_id: string | null
          banned_until: string | null
          cleared_at: string | null
          created_at: string
          id: string
          is_permanent: boolean
          level: string
          order_id: string | null
          reason: string | null
          strike_no: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          banned_until?: string | null
          cleared_at?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          level?: string
          order_id?: string | null
          reason?: string | null
          strike_no?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auction_id?: string | null
          banned_until?: string | null
          cleared_at?: string | null
          created_at?: string
          id?: string
          is_permanent?: boolean
          level?: string
          order_id?: string | null
          reason?: string | null
          strike_no?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_penalties_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_penalties_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_penalties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bid_count: number
          bid_increment: number
          card_id: string
          created_at: string
          current_price: number
          end_time: string
          id: string
          start_time: string
          starting_price: number
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bid_count?: number
          bid_increment?: number
          card_id: string
          created_at?: string
          current_price?: number
          end_time: string
          id?: string
          start_time?: string
          starting_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bid_count?: number
          bid_increment?: number
          card_id?: string
          created_at?: string
          current_price?: number
          end_time?: string
          id?: string
          start_time?: string
          starting_price?: number
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          card_no: string | null
          certification_no: string | null
          condition: string | null
          created_at: string
          details: string | null
          grade: string | null
          grading_company: string | null
          id: string
          images: string[]
          language: string | null
          locked_at: string | null
          locked_by: string | null
          name: string
          price: number
          rarity: string | null
          sale_type: Database["public"]["Enums"]["sale_type"]
          seller_id: string | null
          set_name: string | null
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
          year: number | null
        }
        Insert: {
          card_no?: string | null
          certification_no?: string | null
          condition?: string | null
          created_at?: string
          details?: string | null
          grade?: string | null
          grading_company?: string | null
          id?: string
          images?: string[]
          language?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name: string
          price?: number
          rarity?: string | null
          sale_type?: Database["public"]["Enums"]["sale_type"]
          seller_id?: string | null
          set_name?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          card_no?: string | null
          certification_no?: string | null
          condition?: string | null
          created_at?: string
          details?: string | null
          grade?: string | null
          grading_company?: string | null
          id?: string
          images?: string[]
          language?: string | null
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          price?: number
          rarity?: string | null
          sale_type?: Database["public"]["Enums"]["sale_type"]
          seller_id?: string | null
          set_name?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          pending_username: string | null
          purpose: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          pending_username?: string | null
          purpose?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          pending_username?: string | null
          purpose?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          email_sent_at: string | null
          email_to: string | null
          id: string
          link: string | null
          push_sent_at: string | null
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_sent_at?: string | null
          email_to?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_sent_at?: string | null
          email_to?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          auction_id: string | null
          card_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          payment_due_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          slip_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          card_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_due_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          slip_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auction_id?: string | null
          card_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_due_at?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_at?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          slip_url?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address: string
          created_at: string
          district: string
          id: string
          is_default: boolean
          label: string
          name: string
          phone: string
          postcode: string
          province: string
          subdistrict: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string
          name: string
          phone: string
          postcode?: string
          province?: string
          subdistrict?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string
          name?: string
          phone?: string
          postcode?: string
          province?: string
          subdistrict?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auction_ban_forever: boolean
          auction_banned_until: string | null
          auction_strikes: number
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          is_banned: boolean
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          auction_ban_forever?: boolean
          auction_banned_until?: string | null
          auction_strikes?: number
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          auction_ban_forever?: boolean
          auction_banned_until?: string | null
          auction_strikes?: number
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          is_banned?: boolean
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_auction_strike: {
        Args: { _auction_id: string; _order_id: string; _user_id: string }
        Returns: undefined
      }
      auto_complete_shipped_orders: { Args: never; Returns: number }
      award_auction: {
        Args: { _amount: number; _auction_id: string; _user_id: string }
        Returns: string
      }
      clear_auction_ban: {
        Args: { _reset_strikes?: boolean; _user_id: string }
        Returns: undefined
      }
      close_expired_auctions: { Args: never; Returns: number }
      confirm_order_received: {
        Args: { _order_id: string }
        Returns: {
          auction_id: string | null
          card_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          payment_due_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          slip_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_auction_order: {
        Args: {
          _auction_id: string
          _note?: string
          _payment_method?: Database["public"]["Enums"]["payment_method"]
          _shipping_address?: string
          _shipping_name?: string
          _shipping_phone?: string
        }
        Returns: {
          auction_id: string | null
          card_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          payment_due_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          slip_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_unpaid_orders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_auction_banned: { Args: { _user_id: string }; Returns: boolean }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      notify_user: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      pass_auction_to_next_bidder: {
        Args: { _auction_id: string }
        Returns: {
          bid_count: number
          bid_increment: number
          card_id: string
          created_at: string
          current_price: number
          end_time: string
          id: string
          start_time: string
          starting_price: number
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      purchase_fixed_price_card: {
        Args: {
          _card_id: string
          _note?: string
          _payment_method?: Database["public"]["Enums"]["payment_method"]
          _shipping_address?: string
          _shipping_name?: string
          _shipping_phone?: string
        }
        Returns: {
          auction_id: string | null
          card_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          payment_due_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_at: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_name: string | null
          shipping_phone: string | null
          slip_url: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      relist_auction: {
        Args: { _auction_id: string; _end_time: string }
        Returns: {
          bid_count: number
          bid_increment: number
          card_id: string
          created_at: string
          current_price: number
          end_time: string
          id: string
          start_time: string
          starting_price: number
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
          winner_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "customer" | "admin" | "seller"
      auction_status: "active" | "ended" | "waiting_payment" | "passed_to_next"
      card_status: "available" | "locked" | "sold"
      order_status: "pending" | "paid" | "shipped" | "cancelled" | "completed"
      payment_method: "slip" | "qr_promptpay" | "stripe_promptpay"
      sale_type: "auction" | "fixed_price"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "admin", "seller"],
      auction_status: ["active", "ended", "waiting_payment", "passed_to_next"],
      card_status: ["available", "locked", "sold"],
      order_status: ["pending", "paid", "shipped", "cancelled", "completed"],
      payment_method: ["slip", "qr_promptpay", "stripe_promptpay"],
      sale_type: ["auction", "fixed_price"],
    },
  },
} as const
