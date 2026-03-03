<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Office;

class OfficeController extends Controller
{
    public function index()
    {
        $offices = Office::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'type']);

        return response()->json($offices);
    }
}
