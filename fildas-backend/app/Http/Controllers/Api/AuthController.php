<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with(['role', 'office'])
            ->where('email', $credentials['email'])
            ->whereNull('deleted_at')
            ->first();


        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 422);
        }

        if ($user->disabled_at) {
            return response()->json([
                'message' => 'Account is disabled.',
            ], 403);
        }

        // if you use Sanctum's API tokens:
        $token = $user->createToken('api-token')->plainTextToken;

        $roleName = $user->role ? strtolower(trim($user->role->name)) : null;

        if (!$roleName) {
            return response()->json([
                'message' => 'User has no role assigned.',
            ], 403);
        }

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'     => $user->id,
                'full_name' => $user->full_name,
                'first_name' => $user->first_name,
                'middle_name' => $user->middle_name,
                'last_name' => $user->last_name,
                'suffix' => $user->suffix,
                'profile_photo_path' => $user->profile_photo_path,
                'email'  => $user->email,
                'role'   => $roleName,
                'office' => $user->office ? [  // ← ADD
                    'id'   => $user->office->id,
                    'name' => $user->office->name,
                    'code' => $user->office->code,
                ] : null,
                'office_id' => $user->office_id,

            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out',
        ]);
    }
}
