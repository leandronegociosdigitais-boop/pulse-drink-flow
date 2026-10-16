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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          id: string
          is_paid: boolean
          paid_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cash_flow: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          movement_date: string
          movement_type: string
          origin: string
          product_id: string
          quantity: number
          reference_id: string | null
          resulting_stock: number
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          movement_date?: string
          movement_type: string
          origin: string
          product_id: string
          quantity: number
          reference_id?: string | null
          resulting_stock?: number
          unit_price?: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          movement_date?: string
          movement_type?: string
          origin?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          resulting_stock?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "purchase_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          name: string
          sale_price: number
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          sale_price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          sale_price?: number
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchase_batches: {
        Row: {
          created_at: string
          id: string
          initial_quantity: number
          product_id: string
          purchase_date: string
          purchase_id: string | null
          purchase_price: number
          remaining_quantity: number
          supplier: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          initial_quantity: number
          product_id: string
          purchase_date?: string
          purchase_id?: string | null
          purchase_price: number
          remaining_quantity: number
          supplier?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          initial_quantity?: number
          product_id?: string
          purchase_date?: string
          purchase_id?: string | null
          purchase_price?: number
          remaining_quantity?: number
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_batches_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          payment_method: string
          product_id: string
          quantity: number
          total_amount: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string
          product_id: string
          quantity?: number
          total_amount: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string
          product_id?: string
          quantity?: number
          total_amount?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          profit: number
          quantity: number
          sale_id: string
          subtotal: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          profit: number
          quantity?: number
          sale_id: string
          subtotal: number
          unit_cost: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          profit?: number
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          customer_id: string | null
          discount_amount: number
          id: string
        paid_at: string | null
          payment_method: string
          status: string
          total_amount: number
          total_profit: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
        paid_at?: string | null
          payment_method?: string
          status?: string
          total_amount?: number
          total_profit?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
        paid_at?: string | null
          payment_method?: string
          status?: string
          total_amount?: number
          total_profit?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_app_member: { Args: Record<string, never>; Returns: boolean }
      create_bill_plan: { Args: { p_payload: Json }; Returns: Json }
      create_credit_purchase: { Args: { p_payload: Json }; Returns: Json }
      app_operation: { Args: { p_payload: Json }; Returns: Json }
      fifo_consume_batches: { Args: { p_product_id: string; p_quantity: number; p_sale_id: string }; Returns: Json }
      export_app_backup: { Args: Record<string, never>; Returns: Json }
      restore_app_backup: { Args: { p_backup: Json }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
