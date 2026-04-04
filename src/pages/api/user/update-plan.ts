import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { getUser } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const user = await getUser(cookies);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No autenticado",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await request.json();
    const { planSlug } = body;

    if (!planSlug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Plan no especificado",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Obtener el ID del plan
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, slug, name")
      .eq("slug", planSlug)
      .single();

    if (planError || !planData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Plan no encontrado",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar el plan del usuario en la tabla profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_plan_id: planData.id,
        subscription_status: "active",
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating plan:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al actualizar el plan",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar metadata del usuario en auth.users
    const { error: metadataError } = await supabase.auth.updateUser({
      data: { subscription_plan: planSlug },
    });

    if (metadataError) {
      console.error("Error updating user metadata:", metadataError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan actualizado a ${planData.name}`,
        plan: planData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in update-plan API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Error interno del servidor",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
